<#
.SYNOPSIS
Publishes source-quality collection photographs to Gyazo with verified metadata.

.DESCRIPTION
In the Single parameter set, validates one repository or private camera file,
creates a metadata-sanitized source-quality publication file, uploads it to the
configured Gyazo collection with public field-guide metadata, verifies the
direct image and API metadata responses, and atomically adds the photo record
to the schema 3 collection-photo manifest.

In the Bulk parameter set, migrates each unique publication filename once,
reuses its Gyazo metadata across every manifest reference, and journals every
upload transaction before and after the POST so an interrupted run can resume
without duplicate uploads.
ReplaceExistingFromSources replaces an earlier derivative migration with the
explicitly mapped, unique exact-stem private, or declared evidence source while
retaining the old capture metadata until the replacement manifest commits
atomically. Private source mappings remain in the ignored source cache and are
never copied into the public manifest.

The command reads the OAuth token only from the process-scoped
GYAZO_OAUTH_ACCESS_TOKEN environment variable. Private camera originals are
never removed. JPEG application metadata, auxiliary images, and post-image
trailers are removed without re-encoding the primary image scans; only
recognized color records and a minimal orientation tag are retained. WebP
EXIF/XMP and unknown chunks are removed without re-encoding image chunks.
Crops and PNG inputs are rendered at source resolution in validated temporary
storage for the upload.

.PARAMETER PlantSlug
The exact plant_slug entry that receives a new photo record.

.PARAMETER LiteralPath
An existing file beneath assets/collection-photos or .private-photo-sources.

.PARAMETER CapturedOn
The capture date in yyyy-MM-dd format.

.PARAMETER View
A lowercase, hyphen-delimited view name such as side, top, detail, or context.

.PARAMETER AltText
Alternative text stored in the collection-photo manifest.

.PARAMETER Caption
The photo caption stored in the collection-photo manifest.

.PARAMETER CropGeometry
Optional ImageMagick crop geometry applied after auto-orientation. Cropped
publication files are lossless PNGs.

.PARAMETER MigrateManifest
Uploads missing unique publication files and atomically adds Gyazo metadata to
all matching manifest references. By default it then removes the migrated local
publication binaries; use KeepLocalFiles to defer that cleanup.

.PARAMETER KeepLocalFiles
Bulk-migration safety switch that retains the validated legacy publication
binaries after the schema-3 manifest commit. Use it while remote Collection
memberships and generated output still need independent verification.

.PARAMETER ReplaceExistingFromSources
Re-upload every current schema-3 Gyazo capture from its matching source file,
verify the replacement and public metadata, and atomically replace the remote
capture fields in the manifest. Old Gyazo captures are not deleted by this
script and remain available until the caller completes Collection verification.

.PARAMETER PassThru
Returns Gardening.GyazoPhotoPublication objects after the manifest commit.

.EXAMPLE
./scripts/publish-collection-photo.ps1 -PlantSlug 'mammillaria-plumosa' `
    -LiteralPath './.private-photo-sources/plumosa-top.jpg' `
    -CapturedOn '2026-08-30' -View 'top' `
    -AltText 'Top view of Mammillaria plumosa' `
    -Caption 'Growth view on August 30, 2026.' -WhatIf

.EXAMPLE
./scripts/publish-collection-photo.ps1 -MigrateManifest -WhatIf

.OUTPUTS
Gardening.GyazoPhotoPublication when PassThru is supplied; otherwise no data.
#>
[CmdletBinding(SupportsShouldProcess, DefaultParameterSetName = 'Single', ConfirmImpact = 'Medium')]
param(
    [Parameter(Mandatory, ParameterSetName = 'Single')]
    [ValidatePattern('^[a-z0-9]+(?:-[a-z0-9]+)*$')]
    [string] $PlantSlug,
    [Parameter(Mandatory, ParameterSetName = 'Single')]
    [ValidateNotNullOrEmpty()]
    [string] $LiteralPath,
    [Parameter(Mandatory, ParameterSetName = 'Single')]
    [ValidatePattern('^\d{4}-\d{2}-\d{2}$')]
    [string] $CapturedOn,
    [Parameter(Mandatory, ParameterSetName = 'Single')]
    [ValidatePattern('^[a-z0-9]+(?:-[a-z0-9]+)*$')]
    [string] $View,
    [Parameter(Mandatory, ParameterSetName = 'Single')]
    [ValidateNotNullOrEmpty()]
    [string] $AltText,
    [Parameter(Mandatory, ParameterSetName = 'Single')]
    [ValidateNotNullOrEmpty()]
    [string] $Caption,
    [Parameter(ParameterSetName = 'Single')]
    [ValidatePattern('^\d+x\d+\+\d+\+\d+$')]
    [string] $CropGeometry,
    [Parameter(Mandatory, ParameterSetName = 'Bulk')]
    [switch] $MigrateManifest,
    [Parameter(ParameterSetName = 'Bulk')]
    [switch] $KeepLocalFiles,
    [Parameter(ParameterSetName = 'Bulk')]
    [switch] $ReplaceExistingFromSources,
    [switch] $PassThru
)

Set-StrictMode -Version 3.0

$script:ManifestRelativePath = 'assets/collection-photos/photo-manifest.json'
$script:UploadUri = [uri] 'https://upload.gyazo.com/api/upload'
$script:ImageApiBaseUri = [uri] 'https://api.gyazo.com/api/images/'
$script:DirectImageHost = 'i.gyazo.com'
$script:GyazoApplicationName = 'Fenton Garden Field Guide'
$script:PublicFieldGuideUrl = 'https://nick2bad4u.github.io/Gardening/'
$script:PublicAlbumUrl = 'https://nick2bad4u.github.io/Gardening/layouts/photo-album.html'
$script:PrivateSourceMapRelativePath = '.private-photo-sources/photo-source-map.json'
$script:PrivateSourceNote = 'The publication is rendered from a full-resolution Google Photos export retained in the private source cache; its path is intentionally excluded from the public manifest.'
$script:MaximumSsimDistortion = 0.04

function Get-PublishException {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $Message,
        [Parameter(Mandatory)]
        [string] $ErrorId
    )

    $exception = [System.InvalidOperationException]::new($Message)
    $exception.Data['PublishCollectionPhotoErrorId'] = $ErrorId
    return $exception
}

function Test-ContainedPath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $LiteralPath,
        [Parameter(Mandatory)]
        [string] $RootPath
    )

    $candidate = [System.IO.Path]::GetFullPath($LiteralPath)
    $root = [System.IO.Path]::GetFullPath($RootPath).TrimEnd(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar
    )
    $comparison = if ($IsWindows) {
        [System.StringComparison]::OrdinalIgnoreCase
    }
    else {
        [System.StringComparison]::Ordinal
    }

    return $candidate.StartsWith(
        $root + [System.IO.Path]::DirectorySeparatorChar,
        $comparison
    )
}

function Assert-NoReparsePoint {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $LiteralPath,
        [Parameter(Mandatory)]
        [string] $RootPath
    )

    $root = [System.IO.Path]::GetFullPath($RootPath)
    $candidate = [System.IO.Path]::GetFullPath($LiteralPath)
    $relativePath = [System.IO.Path]::GetRelativePath( $root, $candidate )
    $currentPath = $root

    foreach (
        $part in $relativePath.Split(
            [char[]] @(
                [System.IO.Path]::DirectorySeparatorChar,
                [System.IO.Path]::AltDirectorySeparatorChar
            ),
            [System.StringSplitOptions]::RemoveEmptyEntries
        )
    ) {
        $currentPath = Join-Path -Path $currentPath -ChildPath $part
        $item = Get-Item -LiteralPath $currentPath -Force -ErrorAction Stop
        if (
            (
                $item.Attributes -band [System.IO.FileAttributes]::ReparsePoint
            ) -ne 0
        ) {
            throw (
                Get-PublishException -Message "Photo paths may not traverse a reparse point: '$currentPath'." -ErrorId 'PhotoPathReparsePoint'
            )
        }
    }
}

function Resolve-RepositoryPhotoPath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $LiteralPath,
        [Parameter(Mandatory)]
        [string] $RepositoryRoot,
        [switch] $AllowEvidence
    )

    $resolvedPath = (
        Resolve-Path -LiteralPath $LiteralPath -ErrorAction Stop
    ).ProviderPath
    $item = Get-Item -LiteralPath $resolvedPath -Force -ErrorAction Stop
    if ($item.PSIsContainer) {
        throw (
            Get-PublishException -Message "The photo path must identify a file: '$resolvedPath'." -ErrorId 'PhotoPathIsDirectory'
        )
    }

    $allowedRoots = [System.Collections.Generic.List[string]]::new()
    $allowedRoots.Add(
        (Join-Path -Path $RepositoryRoot -ChildPath 'assets/collection-photos')
    )
    $allowedRoots.Add(
        (Join-Path -Path $RepositoryRoot -ChildPath '.private-photo-sources')
    )
    if ($AllowEvidence) {
        $allowedRoots.Add(
            (Join-Path -Path $RepositoryRoot -ChildPath 'assets/measurements')
        )
        $allowedRoots.Add(
            (Join-Path -Path $RepositoryRoot -ChildPath 'assets/nursery-labels')
        )
    }

    foreach ($allowedRoot in $allowedRoots) {
        if (
            (Test-Path -LiteralPath $allowedRoot -PathType Container) -and
            (
                Test-ContainedPath -LiteralPath $resolvedPath -RootPath $allowedRoot
            )
        ) {
            Assert-NoReparsePoint -LiteralPath $resolvedPath -RootPath $allowedRoot
            return [pscustomobject] @{
                FullName = [System.IO.Path]::GetFullPath($resolvedPath)
                RootPath = [System.IO.Path]::GetFullPath($allowedRoot)
                IsPrivate =
                    [System.IO.Path]::GetFileName(
                        $allowedRoot
                    ) -eq '.private-photo-sources'
            }
        }
    }

    $allowedDescription = if ($AllowEvidence) {
        'assets/collection-photos, assets/measurements, assets/nursery-labels, or .private-photo-sources'
    }
    else {
        'assets/collection-photos or .private-photo-sources'
    }
    throw (
        Get-PublishException -Message "The photo must be inside $allowedDescription in this repository." -ErrorId 'PhotoPathOutsideAllowedRoots'
    )
}

function Get-RepositoryRelativePath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $LiteralPath,
        [Parameter(Mandatory)]
        [string] $RepositoryRoot
    )

    return [System.IO.Path]::GetRelativePath(
        $RepositoryRoot,
        [System.IO.Path]::GetFullPath($LiteralPath)
    ).Replace( [System.IO.Path]::DirectorySeparatorChar, '/' )
}

function Get-CollectionPhotoManifest {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $ManifestPath
    )

    try {
        $manifest = Get-Content -LiteralPath $ManifestPath -Raw -ErrorAction Stop
            | ConvertFrom-Json -Depth 64 -ErrorAction Stop
    }
    catch {
        throw (
            Get-PublishException -Message "The collection photo manifest could not be read: '$ManifestPath'." -ErrorId 'ManifestReadFailed'
        )
    }

    if (
        $null -eq $manifest.schema_version -or [int] $manifest.schema_version -lt 3
    ) {
        throw (
            Get-PublishException -Message 'The collection photo manifest must use schema version 3 or newer before publishing to Gyazo.' -ErrorId 'ManifestSchemaNotSupported'
        )
    }

    return $manifest
}

function Get-ObjectPropertyValue {
    [CmdletBinding()]
    param(
        [AllowNull()]
        [object] $InputObject,
        [Parameter(Mandatory)]
        [string] $Name
    )

    if ($null -eq $InputObject) {
        return $null
    }

    if ($InputObject -is [System.Collections.IDictionary]) {
        return $InputObject[$Name]
    }

    $property = $InputObject.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }

    return $property.Value
}

function Get-CollectionIdValue {
    [CmdletBinding()]
    param(
        [AllowNull()]
        [object] $InputObject
    )

    if ($null -eq $InputObject) {
        return $null
    }

    if ($InputObject -is [string]) {
        return $InputObject
    }

    foreach ($name in @( 'collection_id', 'id' )) {
        $value = Get-ObjectPropertyValue -InputObject $InputObject -Name $name
        if (-not [string]::IsNullOrWhiteSpace([string] $value)) {
            return [string] $value
        }
    }

    return $null
}

function Get-GyazoCollectionId {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object] $Manifest,
        [AllowNull()]
        [object] $Photo,
        [AllowNull()]
        [object] $Plant,
        [AllowNull()]
        [string] $PlantSlug
    )

    $candidateValues = [System.Collections.Generic.List[string]]::new()

    foreach (
        $candidate in @(
            (
                Get-ObjectPropertyValue -InputObject $Photo -Name 'gyazo_collection_id'
            ),
            (
                Get-CollectionIdValue -InputObject (
                    Get-ObjectPropertyValue -InputObject $Photo -Name 'gyazo'
                )
            ),
            (
                Get-ObjectPropertyValue -InputObject $Plant -Name 'gyazo_collection_id'
            ),
            (
                Get-CollectionIdValue -InputObject (
                    Get-ObjectPropertyValue -InputObject $Plant -Name 'gyazo_collection'
                )
            ),
            (
                Get-ObjectPropertyValue -InputObject $Manifest -Name 'gyazo_collection_id'
            ),
            (
                Get-CollectionIdValue -InputObject (
                    Get-ObjectPropertyValue -InputObject $Manifest -Name 'gyazo_collection'
                )
            )
        )
    ) {
        if (-not [string]::IsNullOrWhiteSpace([string] $candidate)) {
            $candidateValues.Add([string] $candidate)
        }
    }

    foreach (
        $containerName in @( 'gyazo_collections', 'gyazo_collection_ids' )
    ) {
        $container = Get-ObjectPropertyValue -InputObject $Manifest -Name $containerName
        if ($null -eq $container) {
            continue
        }

        foreach ($key in @( $PlantSlug, 'collection_photos', 'default' )) {
            if ([string]::IsNullOrWhiteSpace($key)) {
                continue
            }

            $candidate = Get-CollectionIdValue -InputObject (
                Get-ObjectPropertyValue -InputObject $container -Name $key
            )
            if (-not [string]::IsNullOrWhiteSpace([string] $candidate)) {
                $candidateValues.Add([string] $candidate)
            }
        }
    }

    if ($candidateValues.Count -eq 0) {
        throw (
            Get-PublishException -Message "No Gyazo collection ID is configured for '$PlantSlug'." -ErrorId 'GyazoCollectionIdMissing'
        )
    }

    return $candidateValues[0]
}

function Get-GyazoToken {
    [CmdletBinding()]
    param()

    $token = [System.Environment]::GetEnvironmentVariable(
        'GYAZO_OAUTH_ACCESS_TOKEN',
        [System.EnvironmentVariableTarget]::Process
    )
    if ([string]::IsNullOrWhiteSpace($token)) {
        throw (
            Get-PublishException -Message 'Set GYAZO_OAUTH_ACCESS_TOKEN in the current process before publishing.' -ErrorId 'GyazoAccessTokenMissing'
        )
    }

    return $token
}

function ConvertTo-UnixTimestamp {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $CapturedOn
    )

    $parsedDate = [datetime]::MinValue
    if (
        -not [datetime]::TryParseExact(
            $CapturedOn,
            'yyyy-MM-dd',
            [System.Globalization.CultureInfo]::InvariantCulture,
            [System.Globalization.DateTimeStyles]::None,
            [ref] $parsedDate
        )
    ) {
        throw (
            Get-PublishException -Message "The capture date is not a valid calendar date: '$CapturedOn'." -ErrorId 'CapturedOnInvalid'
        )
    }

    $utcDate = [System.DateTimeOffset]::new(
        $parsedDate.Year,
        $parsedDate.Month,
        $parsedDate.Day,
        0,
        0,
        0,
        [System.TimeSpan]::Zero
    )
    return $utcDate.ToUnixTimeSeconds()
}

function Initialize-ValidatedTempDirectory {
    [CmdletBinding()]
    param()

    $tempRoot = Join-Path -Path (
        [System.IO.Path]::GetTempPath()
    ) -ChildPath 'Gardening-Gyazo'
    $null = New-Item -ItemType Directory -Path $tempRoot -Force -ErrorAction Stop
    $tempPath = Join-Path -Path $tempRoot -ChildPath (
        [guid]::NewGuid().ToString('N')
    )
    if (-not (Test-ContainedPath -LiteralPath $tempPath -RootPath $tempRoot)) {
        throw (
            Get-PublishException -Message 'The temporary photo directory could not be validated.' -ErrorId 'TemporaryPathInvalid'
        )
    }

    $null = New-Item -ItemType Directory -Path $tempPath -ErrorAction Stop
    return [System.IO.Path]::GetFullPath($tempPath)
}

function Clear-ValidatedTempDirectory {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $LiteralPath
    )

    $tempRoot = Join-Path -Path (
        [System.IO.Path]::GetTempPath()
    ) -ChildPath 'Gardening-Gyazo'
    $resolvedTempPath = [System.IO.Path]::GetFullPath($LiteralPath)
    if (
        -not (
            Test-ContainedPath -LiteralPath $resolvedTempPath -RootPath $tempRoot
        )
    ) {
        throw (
            Get-PublishException -Message 'Refusing to clean an unvalidated temporary path.' -ErrorId 'TemporaryCleanupPathInvalid'
        )
    }

    if (Test-Path -LiteralPath $resolvedTempPath) {
        Remove-Item -LiteralPath $resolvedTempPath -Recurse -Force -Confirm:$false -ErrorAction Stop
    }
}

function Assert-PublicationImageFile {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $LiteralPath
    )

    $item = Get-Item -LiteralPath $LiteralPath -ErrorAction Stop
    if ($item.Length -lt 12 -or $item.Length -gt [int]::MaxValue) {
        throw (
            Get-PublishException -Message "The publication image is empty or truncated: '$LiteralPath'." -ErrorId 'PublicationImageInvalid'
        )
    }

    $bytes = [System.IO.File]::ReadAllBytes($item.FullName)

    $isJpeg =
    $bytes.Length -ge 4 -and
    $bytes[0] -eq 0xff -and
    $bytes[1] -eq 0xd8 -and
    $bytes[2] -eq 0xff
    $isPng =
    $bytes.Length -ge 20 -and
    [System.Linq.Enumerable]::SequenceEqual(
        [byte[]] $bytes[0..7],
        [byte[]]( 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a )
    )
    $isWebP =
    $bytes.Length -ge 20 -and
    [System.Text.Encoding]::ASCII.GetString(
        $bytes,
        0,
        4
    ) -eq 'RIFF' -and
    [System.Text.Encoding]::ASCII.GetString( $bytes, 8, 4 ) -eq 'WEBP'

    if (-not ($isJpeg -or $isPng -or $isWebP)) {
        throw (
            Get-PublishException -Message "The publication file is not a supported JPEG, PNG, or WebP image: '$LiteralPath'." -ErrorId 'PublicationImageInvalid'
        )
    }

    if (
        $isJpeg -and
        (
            $bytes[$bytes.Length - 2] -ne 0xff -or
            $bytes[$bytes.Length - 1] -ne 0xd9
        )
    ) {
        throw (
            Get-PublishException -Message "The publication JPEG contains trailing or incomplete data: '$LiteralPath'." -ErrorId 'PublicationImageInvalid'
        )
    }
    if (
        $isPng -and
        (
            -not [System.Linq.Enumerable]::SequenceEqual(
                [byte[]] $bytes[($bytes.Length - 12)..($bytes.Length - 9)],
                [byte[]]( 0x00, 0x00, 0x00, 0x00 )
            ) -or
            [System.Text.Encoding]::ASCII.GetString(
                $bytes,
                $bytes.Length - 8,
                4
            ) -ne 'IEND'
        )
    ) {
        throw (
            Get-PublishException -Message "The publication PNG has no final IEND chunk: '$LiteralPath'." -ErrorId 'PublicationImageInvalid'
        )
    }
    if ($isWebP) {
        $declaredLength = [long](
            Read-JpegUInt32 -Bytes $bytes -Offset 4 -LittleEndian $true
        ) + 8L
        $chunks = @(Get-WebPChunkRecord -Bytes $bytes)
        if (
            $declaredLength -ne $bytes.Length -or
            -not (
                $chunks.FourCC | Where-Object {
                    $_ -in @( 'VP8 ', 'VP8L', 'ANMF' )
                }
            )
        ) {
            throw (
                Get-PublishException -Message "The publication WebP has an invalid RIFF length or no image data: '$LiteralPath'." -ErrorId 'PublicationImageInvalid'
            )
        }
    }
}

function Read-JpegUInt16 {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [byte[]] $Bytes,
        [Parameter(Mandatory)]
        [int] $Offset,
        [Parameter(Mandatory)]
        [bool] $LittleEndian
    )

    if ($Offset -lt 0 -or $Offset + 2 -gt $Bytes.Length) {
        return $null
    }
    if ($LittleEndian) {
        return [uint16](
            [uint32] $Bytes[$Offset] -bor
            ([uint32] $Bytes[$Offset + 1] -shl 8)
        )
    }
    return [uint16](
        ([uint32] $Bytes[$Offset] -shl 8) -bor
        [uint32] $Bytes[$Offset + 1]
    )
}

function Read-JpegUInt32 {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [byte[]] $Bytes,
        [Parameter(Mandatory)]
        [int] $Offset,
        [Parameter(Mandatory)]
        [bool] $LittleEndian
    )

    if ($Offset -lt 0 -or $Offset + 4 -gt $Bytes.Length) {
        return $null
    }
    if ($LittleEndian) {
        return [uint32](
            [uint32] $Bytes[$Offset] -bor
            ([uint32] $Bytes[$Offset + 1] -shl 8) -bor
            ([uint32] $Bytes[$Offset + 2] -shl 16) -bor
            ([uint32] $Bytes[$Offset + 3] -shl 24)
        )
    }
    return [uint32](
        ([uint32] $Bytes[$Offset] -shl 24) -bor
        ([uint32] $Bytes[$Offset + 1] -shl 16) -bor
        ([uint32] $Bytes[$Offset + 2] -shl 8) -bor
        [uint32] $Bytes[$Offset + 3]
    )
}

function Get-LittleEndianUInt32Byte {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [uint32] $Value
    )

    return [byte[]](
        [byte]($Value -band 0xff),
        [byte](($Value -shr 8) -band 0xff),
        [byte](($Value -shr 16) -band 0xff),
        [byte](($Value -shr 24) -band 0xff)
    )
}

function Get-WebPChunkRecord {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [byte[]] $Bytes
    )

    if (
        $Bytes.Length -lt 20 -or
        [System.Text.Encoding]::ASCII.GetString( $Bytes, 0, 4 ) -ne 'RIFF' -or
        [System.Text.Encoding]::ASCII.GetString( $Bytes, 8, 4 ) -ne 'WEBP'
    ) {
        throw (
            Get-PublishException -Message 'The WebP source has an invalid RIFF signature.' -ErrorId 'PublicationImageInvalid'
        )
    }

    $declaredLength = [long](
        Read-JpegUInt32 -Bytes $Bytes -Offset 4 -LittleEndian $true
    ) + 8L
    if ($declaredLength -ne $Bytes.Length) {
        throw (
            Get-PublishException -Message 'The WebP source has an invalid RIFF length.' -ErrorId 'PublicationImageInvalid'
        )
    }

    $position = 12
    while ($position -lt $Bytes.Length) {
        if ($position + 8 -gt $Bytes.Length) {
            throw (
                Get-PublishException -Message 'The WebP source contains a truncated chunk header.' -ErrorId 'PublicationImageInvalid'
            )
        }
        $fourCC = [System.Text.Encoding]::ASCII.GetString(
            $Bytes,
            $position,
            4
        )
        $chunkSizeValue = Read-JpegUInt32 -Bytes $Bytes -Offset (
            $position + 4
        ) -LittleEndian $true
        if ($chunkSizeValue -gt [int]::MaxValue) {
            throw (
                Get-PublishException -Message 'The WebP source contains an oversized chunk.' -ErrorId 'PublicationImageInvalid'
            )
        }
        $chunkSize = [int] $chunkSizeValue
        $paddedSize = $chunkSize + ($chunkSize % 2)
        $nextPosition = $position + 8 + $paddedSize
        if ($nextPosition -gt $Bytes.Length) {
            throw (
                Get-PublishException -Message 'The WebP source contains a truncated chunk payload.' -ErrorId 'PublicationImageInvalid'
            )
        }

        [pscustomobject] @{
            FourCC = $fourCC
            Offset = $position
            DataOffset = $position + 8
            Size = $chunkSize
            TotalSize = 8 + $paddedSize
        }
        $position = $nextPosition
    }
}

function Get-JpegOrientation {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [byte[]] $Bytes
    )

    if (
        $Bytes.Length -lt 4 -or
        $Bytes[0] -ne 0xff -or
        $Bytes[1] -ne 0xd8
    ) {
        throw (
            Get-PublishException -Message 'The JPEG source has an invalid signature.' -ErrorId 'PublicationImageInvalid'
        )
    }

    $position = 2
    while ($position + 4 -le $Bytes.Length) {
        if ($Bytes[$position] -ne 0xff) {
            break
        }
        $marker = $Bytes[$position + 1]
        if ($marker -eq 0xda -or $marker -eq 0xd9) {
            break
        }
        if (
            $marker -eq 0x00 -or $marker -eq 0x01 -or (
                $marker -ge 0xd0 -and $marker -le 0xd8
            )
        ) {
            $position += 2
            continue
        }

        $segmentLength =
        ([uint32] $Bytes[$position + 2] -shl 8) -bor
        [uint32] $Bytes[$position + 3]
        $segmentEnd = $position + 2 + $segmentLength
        if ($segmentLength -lt 2 -or $segmentEnd -gt $Bytes.Length) {
            throw (
                Get-PublishException -Message 'The JPEG source contains a truncated marker segment.' -ErrorId 'PublicationImageInvalid'
            )
        }

        $dataOffset = $position + 4
        if (
            $marker -eq 0xe1 -and
            $dataOffset + 6 -le $segmentEnd -and
            [System.Text.Encoding]::ASCII.GetString(
                $Bytes,
                $dataOffset,
                6
            ) -eq "Exif`0`0"
        ) {
            $tiffOffset = $dataOffset + 6
            if ($tiffOffset + 8 -le $segmentEnd) {
                $byteOrder = [System.Text.Encoding]::ASCII.GetString(
                    $Bytes,
                    $tiffOffset,
                    2
                )
                $littleEndian = $byteOrder -eq 'II'
                if ($littleEndian -or $byteOrder -eq 'MM') {
                    $magic = Read-JpegUInt16 -Bytes $Bytes -Offset (
                        $tiffOffset + 2
                    ) -LittleEndian $littleEndian
                    $ifdRelativeOffset = Read-JpegUInt32 -Bytes $Bytes -Offset (
                        $tiffOffset + 4
                    ) -LittleEndian $littleEndian
                    if ($magic -eq 42 -and $null -ne $ifdRelativeOffset) {
                        $ifdOffset = $tiffOffset + [int] $ifdRelativeOffset
                        $entryCount = Read-JpegUInt16 -Bytes $Bytes -Offset $ifdOffset -LittleEndian $littleEndian
                        if ($null -ne $entryCount) {
                            for ($index = 0; $index -lt $entryCount; $index++) {
                                $entryOffset = $ifdOffset + 2 + ($index * 12)
                                if ($entryOffset + 12 -gt $segmentEnd) {
                                    break
                                }
                                $tag = Read-JpegUInt16 -Bytes $Bytes -Offset $entryOffset -LittleEndian $littleEndian
                                $type = Read-JpegUInt16 -Bytes $Bytes -Offset (
                                    $entryOffset + 2
                                ) -LittleEndian $littleEndian
                                $count = Read-JpegUInt32 -Bytes $Bytes -Offset (
                                    $entryOffset + 4
                                ) -LittleEndian $littleEndian
                                if (
                                    $tag -eq 0x0112 -and $type -eq 3 -and $count -ge 1
                                ) {
                                    $orientation = Read-JpegUInt16 -Bytes $Bytes -Offset (
                                        $entryOffset + 8
                                    ) -LittleEndian $littleEndian
                                    if (
                                        $orientation -ge 1 -and $orientation -le 8
                                    ) {
                                        return [int] $orientation
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        $position = $segmentEnd
    }

    return 1
}

function Get-MinimalJpegOrientationSegment {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateRange(2, 8)]
        [int] $Orientation
    )

    return [byte[]](
        0xff,
        0xe1,
        0x00,
        0x22,
        0x45,
        0x78,
        0x69,
        0x66,
        0x00,
        0x00,
        0x49,
        0x49,
        0x2a,
        0x00,
        0x08,
        0x00,
        0x00,
        0x00,
        0x01,
        0x00,
        0x12,
        0x01,
        0x03,
        0x00,
        0x01,
        0x00,
        0x00,
        0x00,
        [byte] $Orientation,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00
    )
}

function ConvertTo-SanitizedJpeg {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $SourcePath,
        [Parameter(Mandatory)]
        [string] $DestinationPath
    )

    $bytes = [System.IO.File]::ReadAllBytes($SourcePath)
    $orientation = Get-JpegOrientation -Bytes $bytes
    $output = [System.IO.MemoryStream]::new($bytes.Length)
    try {
        $output.Write( $bytes, 0, 2 )
        if ($orientation -gt 1) {
            $orientationSegment = Get-MinimalJpegOrientationSegment -Orientation $orientation
            $output.Write( $orientationSegment, 0, $orientationSegment.Length )
        }

        $position = 2
        $copiedImageScan = $false
        $copiedEndOfImage = $false
        while ($position -lt $bytes.Length) {
            if ($bytes[$position] -ne 0xff) {
                throw (
                    Get-PublishException -Message 'The JPEG source contains invalid marker data.' -ErrorId 'PublicationImageInvalid'
                )
            }

            $markerCodePosition = $position + 1
            while (
                $markerCodePosition -lt $bytes.Length -and
                $bytes[$markerCodePosition] -eq 0xff
            ) {
                $markerCodePosition++
            }
            if ($markerCodePosition -ge $bytes.Length) {
                throw (
                    Get-PublishException -Message 'The JPEG source ends inside a marker.' -ErrorId 'PublicationImageInvalid'
                )
            }

            $marker = $bytes[$markerCodePosition]
            if ($marker -eq 0x00) {
                throw (
                    Get-PublishException -Message 'The JPEG source contains a stuffed byte outside image scan data.' -ErrorId 'PublicationImageInvalid'
                )
            }
            if ($marker -eq 0xd9) {
                $output.WriteByte(0xff)
                $output.WriteByte(0xd9)
                $copiedEndOfImage = $true
                break
            }
            if ($marker -eq 0xd8) {
                throw (
                    Get-PublishException -Message 'The JPEG source contains a nested start-of-image marker.' -ErrorId 'PublicationImageInvalid'
                )
            }
            if (
                $marker -eq 0x01 -or
                ($marker -ge 0xd0 -and $marker -le 0xd7)
            ) {
                $output.WriteByte(0xff)
                $output.WriteByte($marker)
                $position = $markerCodePosition + 1
                continue
            }

            $lengthOffset = $markerCodePosition + 1
            if ($lengthOffset + 2 -gt $bytes.Length) {
                throw (
                    Get-PublishException -Message 'The JPEG source contains a truncated marker length.' -ErrorId 'PublicationImageInvalid'
                )
            }
            $segmentLength =
            ([uint32] $bytes[$lengthOffset] -shl 8) -bor
            [uint32] $bytes[$lengthOffset + 1]
            $segmentEnd = $lengthOffset + $segmentLength
            if ($segmentLength -lt 2 -or $segmentEnd -gt $bytes.Length) {
                throw (
                    Get-PublishException -Message 'The JPEG source contains a truncated marker segment.' -ErrorId 'PublicationImageInvalid'
                )
            }

            $dataOffset = $lengthOffset + 2
            $dataLength = $segmentLength - 2
            $safeApplicationSegment =
            (
                $marker -eq 0xe0 -and
                $dataLength -ge 5 -and
                [System.Text.Encoding]::ASCII.GetString(
                    $bytes,
                    $dataOffset,
                    5
                ) -eq "JFIF`0"
            ) -or
            (
                $marker -eq 0xe2 -and
                $dataLength -ge 12 -and
                [System.Text.Encoding]::ASCII.GetString(
                    $bytes,
                    $dataOffset,
                    12
                ) -eq "ICC_PROFILE`0"
            ) -or
            (
                $marker -eq 0xee -and
                $dataLength -ge 5 -and
                [System.Text.Encoding]::ASCII.GetString(
                    $bytes,
                    $dataOffset,
                    5
                ) -eq 'Adobe'
            )
            $isApplicationSegment = $marker -ge 0xe0 -and $marker -le 0xef
            $isComment = $marker -eq 0xfe

            if (
                -not ($isApplicationSegment -or $isComment) -or
                $safeApplicationSegment
            ) {
                $output.WriteByte(0xff)
                $output.WriteByte($marker)
                $output.Write( $bytes, $lengthOffset, $segmentLength )
            }

            if ($marker -ne 0xda) {
                $position = $segmentEnd
                continue
            }

            $copiedImageScan = $true
            $scanStart = $segmentEnd
            $scanPosition = $scanStart
            $nextMarkerFound = $false
            while ($scanPosition -lt $bytes.Length) {
                if ($bytes[$scanPosition] -ne 0xff) {
                    $scanPosition++
                    continue
                }

                $scanMarkerStart = $scanPosition
                $scanCodePosition = $scanPosition + 1
                while (
                    $scanCodePosition -lt $bytes.Length -and
                    $bytes[$scanCodePosition] -eq 0xff
                ) {
                    $scanCodePosition++
                }
                if ($scanCodePosition -ge $bytes.Length) {
                    break
                }
                $scanCode = $bytes[$scanCodePosition]
                if (
                    $scanCode -eq 0x00 -or
                    ($scanCode -ge 0xd0 -and $scanCode -le 0xd7)
                ) {
                    $scanPosition = $scanCodePosition + 1
                    continue
                }

                $output.Write(
                    $bytes,
                    $scanStart,
                    $scanMarkerStart - $scanStart
                )
                $position = $scanMarkerStart
                $nextMarkerFound = $true
                break
            }
            if (-not $nextMarkerFound) {
                throw (
                    Get-PublishException -Message 'The JPEG source contains an unterminated image scan.' -ErrorId 'PublicationImageInvalid'
                )
            }
        }

        if (-not ($copiedImageScan -and $copiedEndOfImage)) {
            throw (
                Get-PublishException -Message 'The JPEG source does not contain a complete primary image.' -ErrorId 'PublicationImageInvalid'
            )
        }

        [System.IO.File]::WriteAllBytes(
            $DestinationPath,
            $output.ToArray()
        )
    }
    finally {
        $output.Dispose()
    }

    Assert-PublicationImageFile -LiteralPath $DestinationPath
}

function ConvertTo-SanitizedWebP {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $SourcePath,
        [Parameter(Mandatory)]
        [string] $DestinationPath
    )

    $bytes = [System.IO.File]::ReadAllBytes($SourcePath)
    $chunks = @(Get-WebPChunkRecord -Bytes $bytes)
    $allowedChunks = @( 'VP8X', 'ICCP', 'ANIM', 'ANMF', 'ALPH', 'VP8 ', 'VP8L' )
    $output = [System.IO.MemoryStream]::new($bytes.Length)
    try {
        $riff = [System.Text.Encoding]::ASCII.GetBytes('RIFF')
        $webp = [System.Text.Encoding]::ASCII.GetBytes('WEBP')
        $output.Write( $riff, 0, $riff.Length )
        $output.Write( [byte[]]( 0, 0, 0, 0 ), 0, 4 )
        $output.Write( $webp, 0, $webp.Length )

        $copiedImageData = $false
        foreach ($chunk in $chunks) {
            if ($chunk.FourCC -notin $allowedChunks) {
                continue
            }
            if ($chunk.FourCC -eq 'VP8X' -and $chunk.Size -ne 10) {
                throw (
                    Get-PublishException -Message 'The WebP source has an invalid VP8X chunk.' -ErrorId 'PublicationImageInvalid'
                )
            }

            $chunkNameBytes = [System.Text.Encoding]::ASCII.GetBytes(
                $chunk.FourCC
            )
            $chunkLengthBytes = Get-LittleEndianUInt32Byte -Value (
                [uint32] $chunk.Size
            )
            $output.Write( $chunkNameBytes, 0, 4 )
            $output.Write( $chunkLengthBytes, 0, 4 )

            if ($chunk.FourCC -eq 'VP8X') {
                $payload = [byte[]]::new($chunk.Size)
                [System.Array]::Copy(
                    $bytes,
                    $chunk.DataOffset,
                    $payload,
                    0,
                    $chunk.Size
                )
                $payload[0] = [byte]([int] $payload[0] -band 0xf3)
                $output.Write( $payload, 0, $payload.Length )
            }
            else {
                $output.Write( $bytes, $chunk.DataOffset, $chunk.Size )
            }
            if ($chunk.Size % 2 -eq 1) {
                $output.WriteByte(0)
            }
            if ($chunk.FourCC -in @( 'VP8 ', 'VP8L', 'ANMF' )) {
                $copiedImageData = $true
            }
        }

        if (-not $copiedImageData) {
            throw (
                Get-PublishException -Message 'The WebP source contains no supported image data.' -ErrorId 'PublicationImageInvalid'
            )
        }

        $result = $output.ToArray()
        $riffLengthBytes = Get-LittleEndianUInt32Byte -Value (
            [uint32]($result.Length - 8)
        )
        [System.Array]::Copy( $riffLengthBytes, 0, $result, 4, 4 )
        [System.IO.File]::WriteAllBytes( $DestinationPath, $result )
    }
    finally {
        $output.Dispose()
    }

    Assert-PublicationImageFile -LiteralPath $DestinationPath
}

function Get-ImageMagickDimension {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $LiteralPath,
        [switch] $AutoOrient
    )

    $magickCommand = Get-Command -Name 'magick' -CommandType Application -ErrorAction SilentlyContinue
        | Select-Object -First 1
    if ($null -eq $magickCommand) {
        throw (
            Get-PublishException -Message 'ImageMagick (magick) is required to sanitize PNGs or create source-quality crops.' -ErrorId 'ImageMagickNotFound'
        )
    }

    $arguments = [System.Collections.Generic.List[string]]::new()
    $arguments.Add($LiteralPath)
    if ($AutoOrient) {
        $arguments.Add('-auto-orient')
    }
    $arguments.Add('-format')
    $arguments.Add('%w %h %[colorspace]')
    $arguments.Add('info:')
    $nativeOutput = & $magickCommand.Source @arguments 2>&1
    $nativeExitCode = $LASTEXITCODE
    $dimensionText = ($nativeOutput | Out-String).Trim()
    if (
        $nativeExitCode -ne 0 -or
        $dimensionText -notmatch '^(?<width>\d+)\s+(?<height>\d+)\s+(?<colorSpace>\S+)$'
    ) {
        throw (
            Get-PublishException -Message "ImageMagick could not identify '$LiteralPath'." -ErrorId 'ImageMagickIdentificationFailed'
        )
    }

    return [pscustomobject] @{
        Width = [int] $Matches.width
        Height = [int] $Matches.height
        ColorSpace = [string] $Matches.colorSpace
        Command = $magickCommand.Source
    }
}

function ConvertTo-LosslessPng {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $SourcePath,
        [Parameter(Mandatory)]
        [string] $DestinationPath,
        [AllowNull()]
        [string] $CropGeometry
    )

    $sourceDimensions = Get-ImageMagickDimension -LiteralPath $SourcePath -AutoOrient
    $expectedWidth = $sourceDimensions.Width
    $expectedHeight = $sourceDimensions.Height
    if (-not [string]::IsNullOrWhiteSpace($CropGeometry)) {
        $cropMatch = [regex]::Match(
            $CropGeometry,
            '^(?<width>\d+)x(?<height>\d+)\+(?<x>\d+)\+(?<y>\d+)$'
        )
        if (-not $cropMatch.Success) {
            throw (
                Get-PublishException -Message 'The crop geometry is invalid.' -ErrorId 'CropGeometryInvalid'
            )
        }
        $expectedWidth = [int] $cropMatch.Groups['width'].Value
        $expectedHeight = [int] $cropMatch.Groups['height'].Value
        $cropX = [int] $cropMatch.Groups['x'].Value
        $cropY = [int] $cropMatch.Groups['y'].Value
        if (
            $expectedWidth -le 0 -or
            $expectedHeight -le 0 -or
            $cropX + $expectedWidth -gt $sourceDimensions.Width -or
            $cropY + $expectedHeight -gt $sourceDimensions.Height
        ) {
            throw (
                Get-PublishException -Message "Crop '$CropGeometry' exceeds the auto-oriented source dimensions $($sourceDimensions.Width)x$($sourceDimensions.Height)." -ErrorId 'CropGeometryOutOfBounds'
            )
        }
    }

    $arguments = [System.Collections.Generic.List[string]]::new()
    $arguments.Add($SourcePath)
    $arguments.Add('-auto-orient')
    if (-not [string]::IsNullOrWhiteSpace($CropGeometry)) {
        $arguments.Add('-crop')
        $arguments.Add($CropGeometry)
        $arguments.Add('+repage')
    }
    $arguments.Add('-colorspace')
    $arguments.Add('sRGB')
    $arguments.Add('-strip')
    $arguments.Add('-define')
    $arguments.Add('png:exclude-chunk=date,time')
    $arguments.Add('-define')
    $arguments.Add('png:compression-level=9')
    $arguments.Add($DestinationPath)

    $nativeOutput = & $sourceDimensions.Command @arguments 2>&1
    $nativeExitCode = $LASTEXITCODE
    if ($nativeExitCode -ne 0) {
        $null = $nativeOutput
        throw (
            Get-PublishException -Message "ImageMagick failed to create a lossless publication PNG (exit code $nativeExitCode)." -ErrorId 'ImageMagickConversionFailed'
        )
    }

    Assert-PublicationImageFile -LiteralPath $DestinationPath
    $outputDimensions = Get-ImageMagickDimension -LiteralPath $DestinationPath
    if (
        $outputDimensions.Width -ne $expectedWidth -or
        $outputDimensions.Height -ne $expectedHeight -or
        $outputDimensions.ColorSpace -ne 'sRGB'
    ) {
        throw (
            Get-PublishException -Message "The publication PNG dimensions or color space did not match the validated source operation." -ErrorId 'ImageMagickConversionInvalid'
        )
    }
}

function ConvertTo-PublicationFile {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object] $Source,
        [Parameter(Mandatory)]
        [string] $CapturedOn,
        [Parameter(Mandatory)]
        [string] $PlantSlug,
        [Parameter(Mandatory)]
        [string] $View,
        [Parameter(Mandatory)]
        [string] $TempDirectory,
        [AllowNull()]
        [string] $ExistingPublicationName,
        [AllowNull()]
        [string] $CropGeometry
    )

    $sourceExtension = [System.IO.Path]::GetExtension(
        $Source.FullName
    ).ToLowerInvariant()
    if ($sourceExtension -notin @( '.jpg', '.jpeg', '.png', '.webp' )) {
        throw (
            Get-PublishException -Message "The source image type is not supported: '$sourceExtension'." -ErrorId 'PublicationImageTypeNotSupported'
        )
    }

    $publicationStem = if (
        [string]::IsNullOrWhiteSpace($ExistingPublicationName)
    ) {
        '{0}-{1}-{2}' -f $CapturedOn, $PlantSlug, $View
    }
    else {
        [System.IO.Path]::GetFileNameWithoutExtension($ExistingPublicationName)
    }
    $publicationExtension = if (
        -not [string]::IsNullOrWhiteSpace($CropGeometry) -or
        $sourceExtension -eq '.png'
    ) {
        '.png'
    }
    elseif ($sourceExtension -in @( '.jpg', '.jpeg' )) {
        '.jpg'
    }
    else {
        '.webp'
    }
    $publicationName = $publicationStem + $publicationExtension
    $stagedPath = Join-Path -Path $TempDirectory -ChildPath $publicationName
    if (
        -not (
            Test-ContainedPath -LiteralPath $stagedPath -RootPath $TempDirectory
        )
    ) {
        throw (
            Get-PublishException -Message 'The temporary publication path could not be validated.' -ErrorId 'PublicationPathInvalid'
        )
    }

    if (-not [string]::IsNullOrWhiteSpace($CropGeometry)) {
        ConvertTo-LosslessPng -SourcePath $Source.FullName -DestinationPath $stagedPath -CropGeometry $CropGeometry
    }
    elseif ($sourceExtension -in @( '.jpg', '.jpeg' )) {
        ConvertTo-SanitizedJpeg -SourcePath $Source.FullName -DestinationPath $stagedPath
    }
    elseif ($sourceExtension -eq '.png') {
        ConvertTo-LosslessPng -SourcePath $Source.FullName -DestinationPath $stagedPath -CropGeometry $null
    }
    else {
        ConvertTo-SanitizedWebP -SourcePath $Source.FullName -DestinationPath $stagedPath
    }

    return [pscustomobject] @{
        FullName = $stagedPath
        PublicationName = $publicationName
        IsTemporary = $true
    }
}

function Get-GyazoUploadDescriptor {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object] $Photo,
        [Parameter(Mandatory)]
        [string] $PlantSlug,
        [Parameter(Mandatory)]
        [ValidateRange(1, [int]::MaxValue)]
        [int] $ReferenceCount
    )

    $capturedOn = [string](
        Get-ObjectPropertyValue -InputObject $Photo -Name 'captured_on'
    )
    if ([string]::IsNullOrWhiteSpace($capturedOn)) {
        $capturedOn = [string](
            Get-ObjectPropertyValue -InputObject $Photo -Name 'provided_on'
        )
    }
    $view = [string](
        Get-ObjectPropertyValue -InputObject $Photo -Name 'view'
    )
    $title = [string](
        Get-ObjectPropertyValue -InputObject $Photo -Name 'alt'
    )
    if ([string]::IsNullOrWhiteSpace($title)) {
        $title = [System.IO.Path]::GetFileNameWithoutExtension(
            [string](
                Get-ObjectPropertyValue -InputObject $Photo -Name 'publication_name'
            )
        ).Replace( '-', ' ' )
    }
    $caption = [string](
        Get-ObjectPropertyValue -InputObject $Photo -Name 'caption'
    )

    $contextParts = [System.Collections.Generic.List[string]]::new()
    if (-not [string]::IsNullOrWhiteSpace($capturedOn)) {
        $contextParts.Add("Captured $capturedOn")
    }
    if (-not [string]::IsNullOrWhiteSpace($view)) {
        $contextParts.Add("view: $view")
    }
    if ($ReferenceCount -gt 1) {
        $contextParts.Add("shared by $ReferenceCount plant profiles")
    }
    $contextParts.Add('Copyright Nick; all rights reserved')

    $descriptionParts = [System.Collections.Generic.List[string]]::new()
    if (-not [string]::IsNullOrWhiteSpace($caption)) {
        $descriptionParts.Add($caption.Trim())
    }
    $descriptionParts.Add(($contextParts -join '; ') + '.')

    $refererUrl = if (
        $PlantSlug -eq 'collection-overview' -or
        $ReferenceCount -gt 1
    ) {
        $script:PublicAlbumUrl
    }
    else {
        $script:PublicFieldGuideUrl + '#' + [System.Uri]::EscapeDataString(
            $PlantSlug
        )
    }

    return [pscustomobject] [ordered] @{
        app = $script:GyazoApplicationName
        title = $title.Trim()
        url = $refererUrl
        desc = $descriptionParts -join ' '
    }
}

function Invoke-GyazoImageUpload {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $LiteralPath,
        [Parameter(Mandatory)]
        [string] $CollectionId,
        [Parameter(Mandatory)]
        [string] $Token,
        [Parameter(Mandatory)]
        [long] $CreatedAt,
        [Parameter(Mandatory)]
        [object] $Metadata
    )

    $headers = @{ Authorization = "Bearer $Token" }
    $form = [ordered] @{
        imagedata = Get-Item -LiteralPath $LiteralPath -ErrorAction Stop
        access_policy = 'anyone'
        metadata_is_public = 'true'
        collection_id = $CollectionId
        referer_url = [string] $Metadata.url
        app = [string] $Metadata.app
        title = [string] $Metadata.title
        desc = [string] $Metadata.desc
        created_at =
            $CreatedAt.ToString(
                [System.Globalization.CultureInfo]::InvariantCulture
            )
    }

    try {
        $response = Invoke-RestMethod -Uri $script:UploadUri -Method Post -Headers $headers -Form $form -ErrorAction Stop
    }
    catch {
        throw (
            Get-PublishException -Message "Gyazo upload failed for '$([System.IO.Path]::GetFileName($LiteralPath))'." -ErrorId 'GyazoUploadFailed'
        )
    }

    foreach ($propertyName in @( 'image_id', 'permalink_url', 'url' )) {
        if (
            [string]::IsNullOrWhiteSpace(
                [string](
                    Get-ObjectPropertyValue -InputObject $response -Name $propertyName
                )
            )
        ) {
            throw (
                Get-PublishException -Message 'Gyazo returned an incomplete upload response.' -ErrorId 'GyazoUploadResponseInvalid'
            )
        }
    }

    return $response
}

function Invoke-GyazoMetadataVerification {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $ImageId,
        [Parameter(Mandatory)]
        [string] $Token,
        [Parameter(Mandatory)]
        [object] $ExpectedMetadata,
        [Parameter(Mandatory)]
        [long] $ExpectedCreatedAt
    )

    if ($ImageId -notmatch '^[a-f0-9]{32}$') {
        throw (
            Get-PublishException -Message 'Gyazo returned an invalid image ID.' -ErrorId 'GyazoImageIdInvalid'
        )
    }

    $metadataUri = [uri]::new( $script:ImageApiBaseUri, $ImageId )
    try {
        $response = Invoke-RestMethod -Uri $metadataUri -Method Get -Headers @{
            Authorization = "Bearer $Token"
        } -ErrorAction Stop
    }
    catch {
        throw (
            Get-PublishException -Message "Gyazo metadata verification failed for image '$ImageId'." -ErrorId 'GyazoMetadataVerificationFailed'
        )
    }

    if ([string] $response.image_id -ne $ImageId) {
        throw (
            Get-PublishException -Message 'Gyazo metadata verification returned the wrong image.' -ErrorId 'GyazoMetadataVerificationFailed'
        )
    }
    try {
        $actualCreatedAt = [DateTimeOffset]::Parse(
            [string] $response.created_at,
            [System.Globalization.CultureInfo]::InvariantCulture,
            [System.Globalization.DateTimeStyles]::AssumeUniversal
        ).ToUnixTimeSeconds()
    }
    catch {
        throw (
            Get-PublishException -Message 'Gyazo metadata verification returned an invalid created_at value.' -ErrorId 'GyazoMetadataVerificationFailed'
        )
    }
    if ($actualCreatedAt -ne $ExpectedCreatedAt) {
        throw (
            Get-PublishException -Message 'Gyazo did not retain the requested capture date.' -ErrorId 'GyazoMetadataVerificationFailed'
        )
    }
    $actualMetadata = Get-ObjectPropertyValue -InputObject $response -Name 'metadata'
    foreach ($propertyName in @( 'app', 'title', 'url', 'desc' )) {
        $actualValue = [string](
            Get-ObjectPropertyValue -InputObject $actualMetadata -Name $propertyName
        )
        $expectedValue = [string](
            Get-ObjectPropertyValue -InputObject $ExpectedMetadata -Name $propertyName
        )
        if ($actualValue -ne $expectedValue) {
            throw (
                Get-PublishException -Message "Gyazo did not retain the expected public '$propertyName' metadata." -ErrorId 'GyazoMetadataVerificationFailed'
            )
        }
    }
}

function Invoke-GyazoRemoteVerification {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $DirectImageUrl,
        [Parameter(Mandatory)]
        [string] $ExpectedImageId,
        [Parameter(Mandatory)]
        [string] $PermalinkUrl,
        [Parameter(Mandatory)]
        [long] $ExpectedLength,
        [Parameter(Mandatory)]
        [ValidatePattern('^[a-f0-9]{64}$')]
        [string] $ExpectedSha256,
        [Parameter(Mandatory)]
        [string] $ExpectedLiteralPath
    )

    if ($ExpectedImageId -notmatch '^[a-f0-9]{32}$') {
        throw (
            Get-PublishException -Message 'Gyazo returned an invalid image ID.' -ErrorId 'GyazoImageIdInvalid'
        )
    }

    try {
        $directUri = [uri] $DirectImageUrl
    }
    catch {
        throw (
            Get-PublishException -Message 'Gyazo returned an invalid direct image URL.' -ErrorId 'GyazoDirectUrlInvalid'
        )
    }

    if (
        $directUri.Scheme -ne [System.Uri]::UriSchemeHttps -or
        $directUri.Host -ne $script:DirectImageHost
    ) {
        throw (
            Get-PublishException -Message 'Gyazo returned an unexpected direct image URL.' -ErrorId 'GyazoDirectUrlInvalid'
        )
    }
    $directLeafName = [System.IO.Path]::GetFileName($directUri.AbsolutePath)
    if (
        -not $directLeafName.StartsWith(
            $ExpectedImageId,
            [System.StringComparison]::OrdinalIgnoreCase
        )
    ) {
        throw (
            Get-PublishException -Message 'The Gyazo direct image URL does not match the returned image ID.' -ErrorId 'GyazoDirectUrlInvalid'
        )
    }

    try {
        $permalinkUri = [uri] $PermalinkUrl
    }
    catch {
        throw (
            Get-PublishException -Message 'Gyazo returned an invalid permalink URL.' -ErrorId 'GyazoPermalinkInvalid'
        )
    }

    if (
        $permalinkUri.Scheme -ne [System.Uri]::UriSchemeHttps -or
        $permalinkUri.Host -ne 'gyazo.com' -or
        $permalinkUri.AbsolutePath.Trim('/') -ne $ExpectedImageId
    ) {
        throw (
            Get-PublishException -Message 'The Gyazo permalink does not match the returned image ID.' -ErrorId 'GyazoPermalinkInvalid'
        )
    }

    try {
        $response = Invoke-WebRequest -Uri $directUri -Method Get -MaximumRedirection 3 -ErrorAction Stop
    }
    catch {
        throw (
            Get-PublishException -Message 'The uploaded Gyazo image could not be verified.' -ErrorId 'GyazoRemoteVerificationFailed'
        )
    }

    $responseHeaders = Get-ObjectPropertyValue -InputObject $response -Name 'Headers'
    $contentType = [string](
        Get-ObjectPropertyValue -InputObject $responseHeaders -Name 'Content-Type'
    )
    $baseResponse = Get-ObjectPropertyValue -InputObject $response -Name 'BaseResponse'
    if (
        [string]::IsNullOrWhiteSpace($contentType) -and $null -ne $baseResponse
    ) {
        $contentType = [string] $baseResponse.Content.Headers.ContentType
    }

    $contentLength = 0L
    if ($null -ne $response.PSObject.Properties['RawContentLength']) {
        $contentLength = [long] $response.RawContentLength
    }
    $responseContent = if ($null -ne $response.PSObject.Properties['Content']) {
        $response.PSObject.Properties['Content'].Value
    }
    else {
        $null
    }
    $responseBytes = if ($responseContent -is [byte[]]) {
        [byte[]] $responseContent
    }
    elseif ($responseContent -is [System.Array]) {
        try {
            [byte[]] @($responseContent)
        }
        catch {
            $null
        }
    }
    else {
        $null
    }
    if ($contentLength -le 0 -and $null -ne $responseBytes) {
        $contentLength = [long] $responseBytes.Length
    }

    if (
        [int] $response.StatusCode -ne 200 -or
        $contentType -notmatch '^image/' -or
        $null -eq $responseBytes -or
        $contentLength -le 0 -or
        $responseBytes.Length -ne $contentLength
    ) {
        throw (
            Get-PublishException -Message 'The uploaded Gyazo URL did not return a complete, non-empty image response.' -ErrorId 'GyazoRemoteVerificationFailed'
        )
    }
    $expectedItem = Get-Item -LiteralPath $ExpectedLiteralPath -ErrorAction Stop
    $actualExpectedSha256 = (
        Get-FileHash -LiteralPath $ExpectedLiteralPath -Algorithm SHA256 -ErrorAction Stop
    ).Hash.ToLowerInvariant()
    if (
        $expectedItem.Length -ne $ExpectedLength -or
        $actualExpectedSha256 -ne $ExpectedSha256
    ) {
        throw (
            Get-PublishException -Message 'The staged publication changed before Gyazo verification.' -ErrorId 'GyazoRemoteVerificationFailed'
        )
    }
    $actualSha256 = [System.Convert]::ToHexString(
        [System.Security.Cryptography.SHA256]::HashData(
            $responseBytes
        )
    ).ToLowerInvariant()
    if (
        $contentLength -eq $ExpectedLength -and
        $actualSha256 -eq $ExpectedSha256
    ) {
        return
    }

    $expectedDirectory = [System.IO.Path]::GetDirectoryName(
        $expectedItem.FullName
    )
    $remoteExtension = [System.IO.Path]::GetExtension($directUri.AbsolutePath)
    if ($remoteExtension -notin @( '.jpg', '.jpeg', '.png', '.webp' )) {
        throw (
            Get-PublishException -Message 'The uploaded Gyazo image has an unsupported direct-image extension.' -ErrorId 'GyazoRemoteVerificationFailed'
        )
    }
    $remotePath = Join-Path -Path $expectedDirectory -ChildPath (
        '.gyazo-verify-{0}{1}' -f [guid]::NewGuid().ToString('N'),
        $remoteExtension
    )
    if (
        -not (
            Test-ContainedPath -LiteralPath $remotePath -RootPath $expectedDirectory
        )
    ) {
        throw (
            Get-PublishException -Message 'The temporary Gyazo verification path could not be validated.' -ErrorId 'GyazoRemoteVerificationFailed'
        )
    }

    try {
        [System.IO.File]::WriteAllBytes( $remotePath, $responseBytes )
        Assert-PublicationImageFile -LiteralPath $remotePath
        $expectedDimensions = Get-ImageMagickDimension -LiteralPath $expectedItem.FullName -AutoOrient
        $remoteDimensions = Get-ImageMagickDimension -LiteralPath $remotePath -AutoOrient
        if (
            $remoteDimensions.Width -ne $expectedDimensions.Width -or
            $remoteDimensions.Height -ne $expectedDimensions.Height
        ) {
            throw (
                Get-PublishException -Message 'Gyazo changed the source publication pixel dimensions.' -ErrorId 'GyazoRemoteVerificationFailed'
            )
        }

        $arguments = @(
            $expectedItem.FullName,
            '-auto-orient',
            '-colorspace',
            'sRGB',
            '(',
            $remotePath,
            '-auto-orient',
            '-colorspace',
            'sRGB',
            ')',
            '-metric',
            'SSIM',
            '-compare',
            '-format',
            '%[distortion]',
            'info:'
        )
        $metricOutput = & $expectedDimensions.Command @arguments 2>&1
        $metricExitCode = $LASTEXITCODE
        $metricText = ($metricOutput | Out-String).Trim()
        $distortion = 0.0
        if (
            $metricExitCode -ne 0 -or
            -not [double]::TryParse(
                $metricText,
                [System.Globalization.NumberStyles]::Float,
                [System.Globalization.CultureInfo]::InvariantCulture,
                [ref] $distortion
            ) -or
            $distortion -lt 0 -or
            $distortion -gt $script:MaximumSsimDistortion
        ) {
            throw (
                Get-PublishException -Message 'Gyazo did not preserve the source publication with sufficient structural similarity.' -ErrorId 'GyazoRemoteVerificationFailed'
            )
        }
    }
    finally {
        if (
            (
                Test-ContainedPath -LiteralPath $remotePath -RootPath $expectedDirectory
            ) -and
            (Test-Path -LiteralPath $remotePath -PathType Leaf)
        ) {
            Remove-Item -LiteralPath $remotePath -Force -Confirm:$false -ErrorAction SilentlyContinue
        }
    }
}

function ConvertTo-GyazoRecord {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object] $Response,
        [Parameter(Mandatory)]
        [string] $CollectionId,
        [Parameter(Mandatory)]
        [object] $UploadMetadata
    )

    return [pscustomobject] [ordered] @{
        image_id = [string] $Response.image_id
        image_url = [string] $Response.url
        page_url = [string] $Response.permalink_url
        type = [string] $Response.type
        collection_id = $CollectionId
        upload_metadata = $UploadMetadata
    }
}

function Get-GyazoRecord {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object] $Photo
    )

    $provider = [string](
        Get-ObjectPropertyValue -InputObject $Photo -Name 'provider'
    )
    $imageId = Get-ObjectPropertyValue -InputObject $Photo -Name 'image_id'
    $imageUrl = Get-ObjectPropertyValue -InputObject $Photo -Name 'image_url'
    $pageUrl = Get-ObjectPropertyValue -InputObject $Photo -Name 'page_url'
    if (
        $provider -eq 'gyazo' -and
        -not [string]::IsNullOrWhiteSpace([string] $imageId) -and
        -not [string]::IsNullOrWhiteSpace([string] $imageUrl) -and
        -not [string]::IsNullOrWhiteSpace([string] $pageUrl)
    ) {
        return [pscustomobject] [ordered] @{
            image_id = [string] $imageId
            image_url = [string] $imageUrl
            page_url = [string] $pageUrl
            type =
                [string](
                    Get-ObjectPropertyValue -InputObject $Photo -Name 'gyazo_type'
                )
            collection_id =
                [string](
                    Get-ObjectPropertyValue -InputObject $Photo -Name 'gyazo_collection_id'
                )
            upload_metadata =
                Get-ObjectPropertyValue -InputObject $Photo -Name 'upload_metadata'
        }
    }

    $metadata = Get-ObjectPropertyValue -InputObject $Photo -Name 'gyazo'
    if ($null -eq $metadata) {
        $imageId = Get-ObjectPropertyValue -InputObject $Photo -Name 'gyazo_image_id'
        $imageUrl = Get-ObjectPropertyValue -InputObject $Photo -Name 'gyazo_url'
        if (
            [string]::IsNullOrWhiteSpace([string] $imageId) -or
            [string]::IsNullOrWhiteSpace([string] $imageUrl)
        ) {
            return $null
        }

        $metadata = [pscustomobject] [ordered] @{
            image_id = [string] $imageId
            image_url = [string] $imageUrl
            page_url =
                [string](
                    Get-ObjectPropertyValue -InputObject $Photo -Name 'gyazo_permalink_url'
                )
            type =
                [string](
                    Get-ObjectPropertyValue -InputObject $Photo -Name 'gyazo_type'
                )
            collection_id =
                [string](
                    Get-ObjectPropertyValue -InputObject $Photo -Name 'gyazo_collection_id'
                )
            upload_metadata =
                Get-ObjectPropertyValue -InputObject $Photo -Name 'upload_metadata'
        }
    }
    else {
        $metadata = [pscustomobject] [ordered] @{
            image_id =
                [string](
                    Get-ObjectPropertyValue -InputObject $metadata -Name 'image_id'
                )
            image_url =
                [string](
                    Get-ObjectPropertyValue -InputObject $metadata -Name 'url'
                )
            page_url =
                [string](
                    Get-ObjectPropertyValue -InputObject $metadata -Name 'permalink_url'
                )
            type =
                [string](
                    Get-ObjectPropertyValue -InputObject $metadata -Name 'type'
                )
            collection_id =
                [string](
                    Get-ObjectPropertyValue -InputObject $metadata -Name 'collection_id'
                )
            upload_metadata =
                Get-ObjectPropertyValue -InputObject $Photo -Name 'upload_metadata'
        }
    }

    if (
        [string]::IsNullOrWhiteSpace(
            [string](
                Get-ObjectPropertyValue -InputObject $metadata -Name 'image_id'
            )
        ) -or
        [string]::IsNullOrWhiteSpace(
            [string](
                Get-ObjectPropertyValue -InputObject $metadata -Name 'image_url'
            )
        ) -or
        [string]::IsNullOrWhiteSpace(
            [string](
                Get-ObjectPropertyValue -InputObject $metadata -Name 'page_url'
            )
        )
    ) {
        return $null
    }

    return $metadata
}

function Merge-GyazoRecord {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object] $Photo,
        [Parameter(Mandatory)]
        [object] $Metadata,
        [Parameter(Mandatory)]
        [string] $PublicationName
    )

    $Photo
        | Add-Member -MemberType NoteProperty -Name 'publication_name' -Value $PublicationName -Force
    $Photo
        | Add-Member -MemberType NoteProperty -Name 'provider' -Value 'gyazo' -Force
    $Photo
        | Add-Member -MemberType NoteProperty -Name 'image_id' -Value (
            [string] $Metadata.image_id
        ) -Force
    $Photo
        | Add-Member -MemberType NoteProperty -Name 'image_url' -Value (
            [string] $Metadata.image_url
        ) -Force
    $Photo
        | Add-Member -MemberType NoteProperty -Name 'page_url' -Value (
            [string] $Metadata.page_url
        ) -Force
    $Photo
        | Add-Member -MemberType NoteProperty -Name 'upload_metadata' -Value (
            $Metadata.upload_metadata
        ) -Force

    $sourceFile = [string](
        Get-ObjectPropertyValue -InputObject $Photo -Name 'source_file'
    )
    if ($sourceFile -match '^assets/collection-photos/') {
        $Photo.PSObject.Properties.Remove('source_file')
    }

    foreach (
        $propertyName in @(
            'file',
            'gyazo',
            'gyazo_image_id',
            'gyazo_permalink_url',
            'gyazo_url',
            'gyazo_type',
            'gyazo_collection_id'
        )
    ) {
        $Photo.PSObject.Properties.Remove($propertyName)
    }
}

function Write-AtomicJsonFile {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object] $InputObject,
        [Parameter(Mandatory)]
        [string] $LiteralPath
    )

    $destination = [System.IO.Path]::GetFullPath($LiteralPath)
    $parentPath = [System.IO.Path]::GetDirectoryName($destination)
    if (-not (Test-Path -LiteralPath $parentPath -PathType Container)) {
        throw (
            Get-PublishException -Message "The JSON destination directory does not exist: '$parentPath'." -ErrorId 'AtomicJsonParentMissing'
        )
    }

    $temporaryPath = Join-Path -Path $parentPath -ChildPath (
        '.{0}.{1}.tmp' -f [System.IO.Path]::GetFileName($destination),
        [guid]::NewGuid().ToString('N')
    )
    $backupPath = Join-Path -Path $parentPath -ChildPath (
        '.{0}.{1}.bak' -f [System.IO.Path]::GetFileName($destination),
        [guid]::NewGuid().ToString('N')
    )
    if (
        -not (
            Test-ContainedPath -LiteralPath $temporaryPath -RootPath $parentPath
        )
    ) {
        throw (
            Get-PublishException -Message 'The temporary JSON path could not be validated.' -ErrorId 'AtomicJsonPathInvalid'
        )
    }
    if (
        -not (Test-ContainedPath -LiteralPath $backupPath -RootPath $parentPath)
    ) {
        throw (
            Get-PublishException -Message 'The backup JSON path could not be validated.' -ErrorId 'AtomicJsonPathInvalid'
        )
    }

    try {
        $json = (
            $InputObject | ConvertTo-Json -Depth 64
        ).Replace( "`r`n", "`n" ).TrimEnd( "`r", "`n" )
        [System.IO.File]::WriteAllText(
            $temporaryPath,
            $json + "`n",
            [System.Text.UTF8Encoding]::new($false)
        )

        if (Test-Path -LiteralPath $destination) {
            [System.IO.File]::Replace(
                $temporaryPath,
                $destination,
                $backupPath,
                $true
            )
        }
        else {
            [System.IO.File]::Move( $temporaryPath, $destination, $false )
        }
    }
    finally {
        if (Test-Path -LiteralPath $temporaryPath) {
            Remove-Item -LiteralPath $temporaryPath -Force -Confirm:$false -ErrorAction SilentlyContinue
        }
        if (Test-Path -LiteralPath $backupPath) {
            Remove-Item -LiteralPath $backupPath -Force -Confirm:$false -ErrorAction SilentlyContinue
        }
    }
}

function Enter-GyazoPublicationLock {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $CollectionPhotoRoot
    )

    $lockPath = Join-Path -Path $CollectionPhotoRoot -ChildPath '.publish-collection-photo.lock'
    if (
        -not (
            Test-ContainedPath -LiteralPath $lockPath -RootPath $CollectionPhotoRoot
        )
    ) {
        throw (
            Get-PublishException -Message 'The publication lock path could not be validated.' -ErrorId 'PublicationLockInvalid'
        )
    }

    try {
        $stream = [System.IO.File]::Open(
            $lockPath,
            [System.IO.FileMode]::OpenOrCreate,
            [System.IO.FileAccess]::ReadWrite,
            [System.IO.FileShare]::Read
        )
    }
    catch [System.IO.IOException] {
        throw (
            Get-PublishException -Message "Another photo publication process holds '$lockPath'." -ErrorId 'PublicationLocked'
        )
    }

    try {
        $lockMetadata = [pscustomobject] [ordered] @{
            process_id = $PID
            started_at = [DateTimeOffset]::UtcNow.ToString('o')
            command = $MyInvocation.PSCommandPath
        }
            | ConvertTo-Json -Compress
        $lockBytes = [System.Text.UTF8Encoding]::new($false).GetBytes(
            $lockMetadata
        )
        $stream.SetLength(0)
        $stream.Write( $lockBytes, 0, $lockBytes.Length )
        $stream.Flush($true)
    }
    catch {
        $stream.Dispose()
        throw
    }

    return [pscustomobject] @{
        Path = $lockPath
        Stream = $stream
        Root = $CollectionPhotoRoot
    }
}

function Exit-GyazoPublicationLock {
    [CmdletBinding()]
    param(
        [AllowNull()]
        [object] $Lock
    )

    if ($null -eq $Lock) {
        return
    }
    $Lock.Stream.Dispose()
    if (
        (
            Test-ContainedPath -LiteralPath $Lock.Path -RootPath $Lock.Root
        ) -and
        (Test-Path -LiteralPath $Lock.Path -PathType Leaf)
    ) {
        Remove-Item -LiteralPath $Lock.Path -Force -Confirm:$false -ErrorAction Stop
    }
}

function Assert-ManifestHash {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $ManifestPath,
        [Parameter(Mandatory)]
        [string] $ExpectedHash
    )

    $actualHash = (
        Get-FileHash -LiteralPath $ManifestPath -Algorithm SHA256 -ErrorAction Stop
    ).Hash
    if ($actualHash -ne $ExpectedHash) {
        throw (
            Get-PublishException -Message 'The collection-photo manifest changed during publication; the remote journal was retained and no manifest update was written.' -ErrorId 'ManifestChangedDuringPublication'
        )
    }
}

function ConvertTo-PublishResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $PlantSlug,
        [Parameter(Mandatory)]
        [string] $File,
        [Parameter(Mandatory)]
        [object] $Metadata,
        [Parameter(Mandatory)]
        [string] $Status,
        [Parameter(Mandatory)]
        [int] $ReferenceCount
    )

    $result = [pscustomobject] [ordered] @{
        PlantSlug = $PlantSlug
        File = $File
        ImageId = [string] $Metadata.image_id
        PermalinkUrl = [string] $Metadata.page_url
        Url = [string] $Metadata.image_url
        Type = [string] $Metadata.type
        CollectionId = [string] $Metadata.collection_id
        Status = $Status
        ReferenceCount = $ReferenceCount
    }
    $result.PSObject.TypeNames.Insert( 0, 'Gardening.GyazoPhotoPublication' )
    return $result
}

function Get-ManifestPhotoOccurrence {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object] $Manifest
    )

    foreach ($photo in @($Manifest.collection_overviews)) {
        [pscustomobject] @{
            PlantSlug = 'collection-overview'
            Plant = $null
            Photo = $photo
        }
    }

    foreach ($plant in @($Manifest.plants)) {
        foreach ($photo in @($plant.photos)) {
            [pscustomobject] @{
                PlantSlug = [string] $plant.plant_slug
                Plant = $plant
                Photo = $photo
            }
        }
    }
}

function Get-PrivatePhotoSourceMap {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $RepositoryRoot
    )

    $privateRoot = Join-Path -Path $RepositoryRoot -ChildPath '.private-photo-sources'
    $mapPath = Join-Path -Path $RepositoryRoot -ChildPath $script:PrivateSourceMapRelativePath
    if (-not (Test-Path -LiteralPath $mapPath -PathType Leaf)) {
        return [pscustomobject] @{ Sources = [pscustomobject] @{} }
    }
    if (
        -not (Test-ContainedPath -LiteralPath $mapPath -RootPath $privateRoot)
    ) {
        throw (
            Get-PublishException -Message 'The private photo source map resolved outside the private cache.' -ErrorId 'MigrationSourceMapInvalid'
        )
    }
    Assert-NoReparsePoint -LiteralPath $mapPath -RootPath $privateRoot

    try {
        $sourceMap = Get-Content -LiteralPath $mapPath -Raw -ErrorAction Stop
            | ConvertFrom-Json -Depth 8 -ErrorAction Stop
    }
    catch {
        throw (
            Get-PublishException -Message 'The private photo source map is invalid JSON.' -ErrorId 'MigrationSourceMapInvalid'
        )
    }
    if (
        [int] $sourceMap.schema_version -ne 1 -or
        $null -eq $sourceMap.sources -or
        $sourceMap.sources -isnot [pscustomobject]
    ) {
        throw (
            Get-PublishException -Message 'The private photo source map has an unsupported schema.' -ErrorId 'MigrationSourceMapInvalid'
        )
    }

    foreach ($property in $sourceMap.sources.PSObject.Properties) {
        $relativeSource = [string] $property.Value
        if (
            $property.Name -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$' -or
            [string]::IsNullOrWhiteSpace($relativeSource) -or
            [System.IO.Path]::IsPathRooted($relativeSource) -or
            $relativeSource.Contains('..') -or
            $relativeSource.Contains('\') -or
            $relativeSource -notmatch '\.(?:jpe?g|png|webp)$'
        ) {
            throw (
                Get-PublishException -Message "The private source mapping '$($property.Name)' is invalid." -ErrorId 'MigrationSourceMapInvalid'
            )
        }
    }

    return [pscustomobject] @{ Sources = $sourceMap.sources }
}

function Resolve-MigrationPhotoSource {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object] $Group,
        [Parameter(Mandatory)]
        [string] $RepositoryRoot
    )

    $privateRoot = Join-Path -Path $RepositoryRoot -ChildPath '.private-photo-sources'
    if (-not (Test-Path -LiteralPath $privateRoot -PathType Container)) {
        throw (
            Get-PublishException -Message 'The private photo source directory is missing.' -ErrorId 'MigrationSourceMissing'
        )
    }
    $publicationStem = [System.IO.Path]::GetFileNameWithoutExtension(
        [string] $Group.Name
    )
    $sourceMap = Get-PrivatePhotoSourceMap -RepositoryRoot $RepositoryRoot
    $mappedSource = [string](
        Get-ObjectPropertyValue -InputObject $sourceMap.Sources -Name $publicationStem
    )
    if (-not [string]::IsNullOrWhiteSpace($mappedSource)) {
        $mappedPath = Join-Path -Path $privateRoot -ChildPath $mappedSource
        $resolvedMappedSource = Resolve-RepositoryPhotoPath -LiteralPath $mappedPath -RepositoryRoot $RepositoryRoot -AllowEvidence
        if (-not $resolvedMappedSource.IsPrivate) {
            throw (
                Get-PublishException -Message "Private mapping '$publicationStem' resolved outside the private cache." -ErrorId 'MigrationSourceMapInvalid'
            )
        }
        return $resolvedMappedSource
    }

    $sourceMatches = @(
        Get-ChildItem -LiteralPath $privateRoot -File -Recurse -ErrorAction Stop |
        Where-Object {
            $_.BaseName -eq $publicationStem -and
            $_.Extension.ToLowerInvariant() -in @(
                '.jpg',
                '.jpeg',
                '.png',
                '.webp'
            )
        }
    )
    if ($sourceMatches.Count -gt 1) {
        throw (
            Get-PublishException -Message "Publication '$($Group.Name)' resolved to more than one exact-stem private source." -ErrorId 'MigrationSourceConflict'
        )
    }
    if ($sourceMatches.Count -eq 1) {
        return Resolve-RepositoryPhotoPath -LiteralPath $sourceMatches[
            0
        ].FullName -RepositoryRoot $RepositoryRoot -AllowEvidence
    }

    $declaredSources = @(
        $Group.Group |
        ForEach-Object {
            [string](
                Get-ObjectPropertyValue -InputObject $_.Photo -Name 'source_file'
            )
        } |
        Where-Object {
            -not [string]::IsNullOrWhiteSpace($_)
        } |
        Sort-Object -Unique
    )
    if ($declaredSources.Count -gt 1) {
        throw (
            Get-PublishException -Message "Publication '$($Group.Name)' has conflicting source_file values." -ErrorId 'MigrationSourceConflict'
        )
    }

    if ($declaredSources.Count -eq 1) {
        $declaredPath = Join-Path -Path $RepositoryRoot -ChildPath $declaredSources[
            0
        ]
        $resolvedDeclaredSource = Resolve-RepositoryPhotoPath -LiteralPath $declaredPath -RepositoryRoot $RepositoryRoot -AllowEvidence
        if ($resolvedDeclaredSource.IsPrivate) {
            throw (
                Get-PublishException -Message "Publication '$($Group.Name)' exposes a private path in source_file; use the ignored private source map instead." -ErrorId 'MigrationSourceMapInvalid'
            )
        }
        return $resolvedDeclaredSource
    }

    throw (
        Get-PublishException -Message "Publication '$($Group.Name)' has no mapped, unique exact-stem, or declared source." -ErrorId 'MigrationSourceMissing'
    )
}

function Get-MigrationCropGeometry {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object] $Group
    )

    $cropValues = @(
        $Group.Group |
        ForEach-Object {
            [string](
                Get-ObjectPropertyValue -InputObject $_.Photo -Name 'crop_geometry'
            )
        } |
        Where-Object {
            -not [string]::IsNullOrWhiteSpace($_)
        } |
        Sort-Object -Unique
    )
    if ($cropValues.Count -gt 1) {
        throw (
            Get-PublishException -Message "Publication '$($Group.Name)' has conflicting crop_geometry values." -ErrorId 'MigrationSourceConflict'
        )
    }
    if ($cropValues.Count -eq 0) {
        return $null
    }
    if ($cropValues[0] -notmatch '^\d+x\d+\+\d+\+\d+$') {
        throw (
            Get-PublishException -Message "Publication '$($Group.Name)' has invalid crop_geometry." -ErrorId 'MigrationSourceInvalid'
        )
    }
    return $cropValues[0]
}

function Get-MigrationJournal {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $LiteralPath
    )

    if (-not (Test-Path -LiteralPath $LiteralPath)) {
        return [pscustomobject] [ordered] @{ schema_version = 2; entries = @() }
    }

    try {
        $journal = Get-Content -LiteralPath $LiteralPath -Raw -ErrorAction Stop
            | ConvertFrom-Json -Depth 32 -ErrorAction Stop
    }
    catch {
        throw (
            Get-PublishException -Message 'The Gyazo migration journal is invalid and was left in place for review.' -ErrorId 'MigrationJournalInvalid'
        )
    }

    if ([int] $journal.schema_version -ne 2) {
        throw (
            Get-PublishException -Message 'The Gyazo migration journal has an unsupported schema version.' -ErrorId 'MigrationJournalInvalid'
        )
    }

    if ($null -eq $journal.PSObject.Properties['entries']) {
        throw (
            Get-PublishException -Message 'The Gyazo migration journal has no entries array.' -ErrorId 'MigrationJournalInvalid'
        )
    }
    foreach ($entry in @($journal.entries)) {
        $status = [string](
            Get-ObjectPropertyValue -InputObject $entry -Name 'status'
        )
        if (
            $status -notin @( 'uploading', 'ambiguous', 'uploaded', 'verified' )
        ) {
            throw (
                Get-PublishException -Message 'The Gyazo migration journal contains an invalid transaction status.' -ErrorId 'MigrationJournalInvalid'
            )
        }
    }

    return $journal
}

function Get-GyazoMetadataHash {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object] $Metadata
    )

    $canonicalMetadata = [ordered] @{}
    foreach ($propertyName in @( 'app', 'title', 'url', 'desc' )) {
        $canonicalMetadata[$propertyName] = [string](
            Get-ObjectPropertyValue -InputObject $Metadata -Name $propertyName
        )
    }
    $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes(
        ($canonicalMetadata | ConvertTo-Json -Compress)
    )
    return [System.Convert]::ToHexString(
        [System.Security.Cryptography.SHA256]::HashData($bytes)
    ).ToLowerInvariant()
}

function Get-GyazoJournalEntry {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $File,
        [Parameter(Mandatory)]
        [string] $PublicationName,
        [Parameter(Mandatory)]
        [ValidatePattern('^[a-f0-9]{64}$')]
        [string] $Sha256,
        [Parameter(Mandatory)]
        [long] $Length,
        [Parameter(Mandatory)]
        [string] $CollectionId,
        [Parameter(Mandatory)]
        [long] $CreatedAt,
        [Parameter(Mandatory)]
        [ValidatePattern('^[a-f0-9]{64}$')]
        [string] $MetadataSha256
    )

    return [pscustomobject] [ordered] @{
        file = $File
        publication_name = $PublicationName
        sha256 = $Sha256
        length = $Length
        collection_id = $CollectionId
        created_at = $CreatedAt
        metadata_sha256 = $MetadataSha256
        status = 'uploading'
        attempt_started_at = [DateTimeOffset]::UtcNow.ToString('o')
    }
}

function Test-GyazoJournalEntryFingerprint {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object] $Entry,
        [Parameter(Mandatory)]
        [string] $File,
        [Parameter(Mandatory)]
        [string] $PublicationName,
        [Parameter(Mandatory)]
        [string] $Sha256,
        [Parameter(Mandatory)]
        [long] $Length,
        [Parameter(Mandatory)]
        [string] $CollectionId,
        [Parameter(Mandatory)]
        [long] $CreatedAt,
        [Parameter(Mandatory)]
        [string] $MetadataSha256
    )

    return (
        [string] $Entry.file -eq $File -and
        [string] $Entry.publication_name -eq $PublicationName -and
        [string] $Entry.sha256 -eq $Sha256 -and
        [long] $Entry.length -eq $Length -and
        [string] $Entry.collection_id -eq $CollectionId -and
        [long] $Entry.created_at -eq $CreatedAt -and
        [string] $Entry.metadata_sha256 -eq $MetadataSha256
    )
}

function ConvertTo-GyazoJournalStatus {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object] $Entry,
        [Parameter(Mandatory)]
        [ValidateSet('ambiguous', 'uploaded', 'verified')]
        [string] $Status,
        [AllowNull()]
        [object] $Metadata
    )

    $Entry
        | Add-Member -MemberType NoteProperty -Name 'status' -Value $Status -Force
    $Entry
        | Add-Member -MemberType NoteProperty -Name 'updated_at' -Value (
            [DateTimeOffset]::UtcNow.ToString('o')
        ) -Force
    if ($null -ne $Metadata) {
        $Entry
            | Add-Member -MemberType NoteProperty -Name 'gyazo' -Value $Metadata -Force
    }
}

function Assert-GyazoJournalEntryResumable {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object] $Entry,
        [Parameter(Mandatory)]
        [string] $PublicationName
    )

    $status = [string] $Entry.status
    if ($status -in @( 'uploading', 'ambiguous' )) {
        throw (
            Get-PublishException -Message "The prior Gyazo upload for '$PublicationName' has an ambiguous outcome. Reconcile or delete that exact capture in Gyazo, then remove the matching journal entry before retrying." -ErrorId 'GyazoUploadOutcomeAmbiguous'
        )
    }
    if (
        $status -notin @( 'uploaded', 'verified' ) -or
        $null -eq $Entry.PSObject.Properties['gyazo']
    ) {
        throw (
            Get-PublishException -Message "The prior Gyazo upload transaction for '$PublicationName' cannot be resumed safely." -ErrorId 'MigrationJournalInvalid'
        )
    }
}

$operationLock = $null
try {
    $repositoryRoot = [System.IO.Path]::GetFullPath(
        (Join-Path -Path $PSScriptRoot -ChildPath '..')
    )
    $collectionPhotoRoot = Join-Path -Path $repositoryRoot -ChildPath 'assets/collection-photos'
    $manifestPath = Join-Path -Path $repositoryRoot -ChildPath $script:ManifestRelativePath
    if (-not $WhatIfPreference) {
        $operationLock = Enter-GyazoPublicationLock -CollectionPhotoRoot $collectionPhotoRoot
    }
    $initialManifestHash = (
        Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256 -ErrorAction Stop
    ).Hash
    $manifest = Get-CollectionPhotoManifest -ManifestPath $manifestPath

    if ($PSCmdlet.ParameterSetName -eq 'Single') {
        $createdAt = ConvertTo-UnixTimestamp -CapturedOn $CapturedOn
        $source = Resolve-RepositoryPhotoPath -LiteralPath $LiteralPath -RepositoryRoot $repositoryRoot
        $plant = @($manifest.plants | Where-Object plant_slug -EQ $PlantSlug)
        if ($plant.Count -ne 1) {
            throw (
                Get-PublishException -Message "PlantSlug must identify exactly one manifest plant: '$PlantSlug'." -ErrorId 'PlantSlugNotFound'
            )
        }

        $collectionId = Get-GyazoCollectionId -Manifest $manifest -Photo $null -Plant $plant[
            0
        ] -PlantSlug $PlantSlug
        $targetDescription = "'$PlantSlug' from '$($source.FullName)'"
        if (
            -not $PSCmdlet.ShouldProcess(
                $targetDescription,
                'Create a metadata-sanitized source-quality publication, upload it to Gyazo with public field-guide metadata, verify it, and update the manifest'
            )
        ) {
            return
        }

        $token = Get-GyazoToken
        $tempDirectory = Initialize-ValidatedTempDirectory
        try {
            $publication = ConvertTo-PublicationFile -Source $source -CapturedOn $CapturedOn -PlantSlug $PlantSlug -View $View -TempDirectory $tempDirectory -CropGeometry $CropGeometry
            $duplicatePhoto = @(
                $plant[0].photos | Where-Object {
                    $existingPublicationName = [string](
                        Get-ObjectPropertyValue -InputObject $_ -Name 'publication_name'
                    )
                    $legacyFile = [string](
                        Get-ObjectPropertyValue -InputObject $_ -Name 'file'
                    )
                    $legacyLeafName = if (
                        [string]::IsNullOrWhiteSpace($legacyFile)
                    ) {
                        $null
                    }
                    else {
                        [System.IO.Path]::GetFileName($legacyFile)
                    }
                    $existingPublicationName -eq $publication.PublicationName -or
                    $legacyLeafName -eq $publication.PublicationName
                }
            )
            if ($duplicatePhoto.Count -gt 0) {
                throw (
                    Get-PublishException -Message "The manifest already contains publication '$($publication.PublicationName)' for '$PlantSlug'." -ErrorId 'ManifestPhotoAlreadyExists'
                )
            }

            $photo = [pscustomobject] [ordered] @{
                publication_name = $publication.PublicationName
                kind = 'collection'
                captured_on = $CapturedOn
                view = $View
                alt = $AltText
                caption = $Caption
            }
            if ($source.IsPrivate) {
                $photo
                    | Add-Member -MemberType NoteProperty -Name 'source_note' -Value $script:PrivateSourceNote
            }
            else {
                $photo
                    | Add-Member -MemberType NoteProperty -Name 'source_file' -Value (
                        Get-RepositoryRelativePath -LiteralPath $source.FullName -RepositoryRoot $repositoryRoot
                    )
            }
            if (-not [string]::IsNullOrWhiteSpace($CropGeometry)) {
                $photo
                    | Add-Member -MemberType NoteProperty -Name 'crop_geometry' -Value $CropGeometry
                $photo
                    | Add-Member -MemberType NoteProperty -Name 'derivation_note' -Value 'Lossless source-resolution crop from the auto-oriented private photograph; hidden source metadata is removed before upload.'
            }
            $uploadMetadata = Get-GyazoUploadDescriptor -Photo $photo -PlantSlug $PlantSlug -ReferenceCount 1
            $publicationItem = Get-Item -LiteralPath $publication.FullName -ErrorAction Stop
            $publicationSha256 = (
                Get-FileHash -LiteralPath $publication.FullName -Algorithm SHA256 -ErrorAction Stop
            ).Hash.ToLowerInvariant()
            $metadataSha256 = Get-GyazoMetadataHash -Metadata $uploadMetadata
            $journalPath = Join-Path -Path $collectionPhotoRoot -ChildPath '.gyazo-single-upload-journal.json'
            $journal = Get-MigrationJournal -LiteralPath $journalPath
            $fileKey = "single:$PlantSlug"
            $journalMatches = @(
                $journal.entries | Where-Object {
                    Test-GyazoJournalEntryFingerprint -Entry $_ -File $fileKey -PublicationName $publication.PublicationName -Sha256 $publicationSha256 -Length $publicationItem.Length -CollectionId $collectionId -CreatedAt $createdAt -MetadataSha256 $metadataSha256
                }
            )
            if ($journalMatches.Count -gt 1) {
                throw (
                    Get-PublishException -Message 'The single-photo Gyazo journal contains duplicate transaction records.' -ErrorId 'MigrationJournalInvalid'
                )
            }

            $metadata = $null
            $publicationStatus = 'Uploaded'
            if ($journalMatches.Count -eq 1) {
                $journalEntry = $journalMatches[0]
                Assert-GyazoJournalEntryResumable -Entry $journalEntry -PublicationName $publication.PublicationName
                $metadata = $journalEntry.gyazo
                $publicationStatus = 'Resumed'
            }
            else {
                if (@($journal.entries).Count -gt 0) {
                    throw (
                        Get-PublishException -Message 'A different single-photo Gyazo transaction is already journaled. Reconcile it before starting another upload.' -ErrorId 'MigrationJournalConflict'
                    )
                }
                $journalEntry = Get-GyazoJournalEntry -File $fileKey -PublicationName $publication.PublicationName -Sha256 $publicationSha256 -Length $publicationItem.Length -CollectionId $collectionId -CreatedAt $createdAt -MetadataSha256 $metadataSha256
                $journal.entries = @($journalEntry)
                Write-AtomicJsonFile -InputObject $journal -LiteralPath $journalPath
                try {
                    $uploadResponse = Invoke-GyazoImageUpload -LiteralPath $publication.FullName -CollectionId $collectionId -Token $token -CreatedAt $createdAt -Metadata $uploadMetadata
                }
                catch {
                    ConvertTo-GyazoJournalStatus -Entry $journalEntry -Status 'ambiguous'
                    Write-AtomicJsonFile -InputObject $journal -LiteralPath $journalPath
                    throw
                }
                $metadata = ConvertTo-GyazoRecord -Response $uploadResponse -CollectionId $collectionId -UploadMetadata $uploadMetadata
                ConvertTo-GyazoJournalStatus -Entry $journalEntry -Status 'uploaded' -Metadata $metadata
                Write-AtomicJsonFile -InputObject $journal -LiteralPath $journalPath
            }
            Invoke-GyazoRemoteVerification -DirectImageUrl (
                [string] $metadata.image_url
            ) -ExpectedImageId (
                [string] $metadata.image_id
            ) -PermalinkUrl (
                [string] $metadata.page_url
            ) -ExpectedLength $publicationItem.Length -ExpectedSha256 $publicationSha256 -ExpectedLiteralPath $publication.FullName
            Invoke-GyazoMetadataVerification -ImageId (
                [string] $metadata.image_id
            ) -Token $token -ExpectedMetadata $uploadMetadata -ExpectedCreatedAt $createdAt
            ConvertTo-GyazoJournalStatus -Entry $journalEntry -Status 'verified' -Metadata $metadata
            Write-AtomicJsonFile -InputObject $journal -LiteralPath $journalPath
            Merge-GyazoRecord -Photo $photo -Metadata $metadata -PublicationName $publication.PublicationName
            $plant[0].photos = @($plant[0].photos) + $photo
            Assert-ManifestHash -ManifestPath $manifestPath -ExpectedHash $initialManifestHash
            Write-AtomicJsonFile -InputObject $manifest -LiteralPath $manifestPath
            Remove-Item -LiteralPath $journalPath -Force -Confirm:$false -ErrorAction Stop

            if ($PassThru) {
                ConvertTo-PublishResult -PlantSlug $PlantSlug -File $publication.PublicationName -Metadata $metadata -Status $publicationStatus -ReferenceCount 1
            }
        }
        finally {
            Clear-ValidatedTempDirectory -LiteralPath $tempDirectory
        }
    }
    else {
        $null = $MigrateManifest
        $allOccurrences = @(Get-ManifestPhotoOccurrence -Manifest $manifest)
        if ($ReplaceExistingFromSources) {
            $occurrences = @(
                $allOccurrences | Where-Object {
                    [string](
                        Get-ObjectPropertyValue -InputObject $_.Photo -Name 'provider'
                    ) -eq 'gyazo' -and
                    -not [string]::IsNullOrWhiteSpace(
                        [string](
                            Get-ObjectPropertyValue -InputObject $_.Photo -Name 'publication_name'
                        )
                    )
                }
            )
            $groups = @(
                $occurrences | Group-Object -Property {
                    [string] $_.Photo.publication_name
                } | Sort-Object -Property Name
            )
        }
        else {
            $occurrences = @(
                $allOccurrences | Where-Object {
                    [string](
                        Get-ObjectPropertyValue -InputObject $_.Photo -Name 'file'
                    ) -match '^assets/collection-photos/.+\.webp$'
                }
            )
            $groups = @(
                $occurrences | Group-Object -Property {
                    [string] $_.Photo.file
                } | Sort-Object -Property Name
            )
        }
        if ($groups.Count -eq 0) {
            $photoDescription = if ($ReplaceExistingFromSources) {
                'current Gyazo captures to replace'
            }
            else {
                'collection publication WebP files to migrate'
            }
            throw (
                Get-PublishException -Message "The manifest contains no $photoDescription." -ErrorId 'MigrationHasNoPhotos'
            )
        }

        if ($ReplaceExistingFromSources) {
            foreach ($group in $groups) {
                $null = Resolve-MigrationPhotoSource -Group $group -RepositoryRoot $repositoryRoot
                $null = Get-MigrationCropGeometry -Group $group
            }
        }
        else {
            foreach ($group in $groups) {
                $publicationPath = Join-Path -Path $repositoryRoot -ChildPath $group.Name
                $resolvedPublication = Resolve-RepositoryPhotoPath -LiteralPath $publicationPath -RepositoryRoot $repositoryRoot
                if ($resolvedPublication.IsPrivate) {
                    throw (
                        Get-PublishException -Message "A manifest publication resolved to the private source directory: '$($group.Name)'." -ErrorId 'ManifestPublicationPathInvalid'
                    )
                }
                Assert-PublicationImageFile -LiteralPath $resolvedPublication.FullName
            }
        }

        $migrationAction = if ($ReplaceExistingFromSources) {
            'Upload metadata-sanitized source-quality replacements, verify image and public metadata responses, and atomically replace manifest capture fields while retaining old Gyazo captures'
        }
        elseif ($KeepLocalFiles) {
            'Upload missing images to Gyazo, verify them, and atomically migrate the manifest while retaining legacy publication binaries'
        }
        else {
            'Upload missing images to Gyazo, verify them, atomically migrate the manifest, and remove legacy publication binaries'
        }
        if (
            -not $PSCmdlet.ShouldProcess(
                "$($groups.Count) unique collection photographs in '$manifestPath'",
                $migrationAction
            )
        ) {
            return
        }

        $token = Get-GyazoToken
        $journalName = if ($ReplaceExistingFromSources) {
            '.gyazo-source-migration-journal.json'
        }
        else {
            '.gyazo-migration-journal.json'
        }
        $journalPath = Join-Path -Path $collectionPhotoRoot -ChildPath $journalName
        $journal = Get-MigrationJournal -LiteralPath $journalPath
        $results = [System.Collections.Generic.List[object]]::new()

        foreach ($group in $groups) {
            $representative = $group.Group[0]
            $collectionId = Get-GyazoCollectionId -Manifest $manifest -Photo $representative.Photo -Plant $representative.Plant -PlantSlug $representative.PlantSlug
            $capturedOnValue = [string](
                Get-ObjectPropertyValue -InputObject $representative.Photo -Name 'captured_on'
            )
            if ([string]::IsNullOrWhiteSpace($capturedOnValue)) {
                $capturedOnValue = [string](
                    Get-ObjectPropertyValue -InputObject $representative.Photo -Name 'provided_on'
                )
            }
            if ([string]::IsNullOrWhiteSpace($capturedOnValue)) {
                throw (
                    Get-PublishException -Message "Publication '$($group.Name)' needs captured_on or provided_on before migration." -ErrorId 'PhotoEvidenceDateMissing'
                )
            }
            $createdAt = ConvertTo-UnixTimestamp -CapturedOn $capturedOnValue
            $tempDirectory = Initialize-ValidatedTempDirectory
            try {
                if ($ReplaceExistingFromSources) {
                    $source = Resolve-MigrationPhotoSource -Group $group -RepositoryRoot $repositoryRoot
                    $cropValue = Get-MigrationCropGeometry -Group $group
                    $publication = ConvertTo-PublicationFile -Source $source -CapturedOn $capturedOnValue -PlantSlug $representative.PlantSlug -View (
                        [string](
                            Get-ObjectPropertyValue -InputObject $representative.Photo -Name 'view'
                        )
                    ) -TempDirectory $tempDirectory -ExistingPublicationName $group.Name -CropGeometry $cropValue
                }
                else {
                    $publicationPath = Join-Path -Path $repositoryRoot -ChildPath $group.Name
                    $source = Resolve-RepositoryPhotoPath -LiteralPath $publicationPath -RepositoryRoot $repositoryRoot
                    $publication = ConvertTo-PublicationFile -Source $source -CapturedOn $capturedOnValue -PlantSlug $representative.PlantSlug -View (
                        [string](
                            Get-ObjectPropertyValue -InputObject $representative.Photo -Name 'view'
                        )
                    ) -TempDirectory $tempDirectory -ExistingPublicationName (
                        [System.IO.Path]::GetFileName($group.Name)
                    )
                    $cropValue = $null
                }

                $fileItem = Get-Item -LiteralPath $publication.FullName -ErrorAction Stop
                $sha256 = (
                    Get-FileHash -LiteralPath $publication.FullName -Algorithm SHA256 -ErrorAction Stop
                ).Hash.ToLowerInvariant()
                $uploadMetadata = Get-GyazoUploadDescriptor -Photo $representative.Photo -PlantSlug $representative.PlantSlug -ReferenceCount $group.Count
                $metadataSha256 = Get-GyazoMetadataHash -Metadata $uploadMetadata
                $metadata = $null
                $status = 'Existing'

                $existingMetadata = @(
                    if (-not $ReplaceExistingFromSources) {
                        $group.Group
                            | ForEach-Object {
                                Get-GyazoRecord -Photo $_.Photo
                            }
                            | Where-Object {
                                $null -ne $_
                            }
                    }
                )
                if ($existingMetadata.Count -gt 0) {
                    $metadata = $existingMetadata[0]
                    $metadata.collection_id = $collectionId
                    foreach ($candidate in $existingMetadata) {
                        if (
                            [string] $candidate.image_id -ne [string] $metadata.image_id -or
                            [string] $candidate.image_url -ne [string] $metadata.image_url -or
                            [string] $candidate.page_url -ne [string] $metadata.page_url
                        ) {
                            throw (
                                Get-PublishException -Message "Shared publication '$($group.Name)' contains conflicting Gyazo metadata." -ErrorId 'SharedPublicationMetadataConflict'
                            )
                        }
                    }
                    Invoke-GyazoRemoteVerification -DirectImageUrl (
                        [string] $metadata.image_url
                    ) -ExpectedImageId (
                        [string] $metadata.image_id
                    ) -PermalinkUrl (
                        [string] $metadata.page_url
                    ) -ExpectedLength $fileItem.Length -ExpectedSha256 $sha256 -ExpectedLiteralPath $publication.FullName
                    if ($null -ne $metadata.upload_metadata) {
                        Invoke-GyazoMetadataVerification -ImageId (
                            [string] $metadata.image_id
                        ) -Token $token -ExpectedMetadata $metadata.upload_metadata -ExpectedCreatedAt $createdAt
                    }
                }
                else {
                    $journalEntry = @(
                        $journal.entries | Where-Object {
                            Test-GyazoJournalEntryFingerprint -Entry $_ -File $group.Name -PublicationName $publication.PublicationName -Sha256 $sha256 -Length $fileItem.Length -CollectionId $collectionId -CreatedAt $createdAt -MetadataSha256 $metadataSha256
                        }
                    )
                    if ($journalEntry.Count -gt 1) {
                        throw (
                            Get-PublishException -Message "The Gyazo migration journal contains duplicate transactions for '$($group.Name)'." -ErrorId 'MigrationJournalInvalid'
                        )
                    }
                    if ($journalEntry.Count -eq 1) {
                        $journalRecord = $journalEntry[0]
                        Assert-GyazoJournalEntryResumable -Entry $journalRecord -PublicationName $publication.PublicationName
                        $metadata = $journalRecord.gyazo
                        $status = 'Resumed'
                    }
                    else {
                        $conflictingEntries = @(
                            $journal.entries | Where-Object {
                                [string] $_.file -eq $group.Name
                            }
                        )
                        if ($conflictingEntries.Count -gt 0) {
                            throw (
                                Get-PublishException -Message "The Gyazo migration journal fingerprint for '$($group.Name)' no longer matches the prepared publication or public metadata." -ErrorId 'MigrationJournalConflict'
                            )
                        }
                        $journalRecord = Get-GyazoJournalEntry -File $group.Name -PublicationName $publication.PublicationName -Sha256 $sha256 -Length $fileItem.Length -CollectionId $collectionId -CreatedAt $createdAt -MetadataSha256 $metadataSha256
                        $journal.entries = @($journal.entries) + $journalRecord
                        Write-AtomicJsonFile -InputObject $journal -LiteralPath $journalPath
                        try {
                            $uploadResponse = Invoke-GyazoImageUpload -LiteralPath $publication.FullName -CollectionId $collectionId -Token $token -CreatedAt $createdAt -Metadata $uploadMetadata
                        }
                        catch {
                            ConvertTo-GyazoJournalStatus -Entry $journalRecord -Status 'ambiguous'
                            Write-AtomicJsonFile -InputObject $journal -LiteralPath $journalPath
                            throw
                        }
                        $metadata = ConvertTo-GyazoRecord -Response $uploadResponse -CollectionId $collectionId -UploadMetadata $uploadMetadata
                        ConvertTo-GyazoJournalStatus -Entry $journalRecord -Status 'uploaded' -Metadata $metadata
                        Write-AtomicJsonFile -InputObject $journal -LiteralPath $journalPath
                        $status = 'Uploaded'
                    }
                    Invoke-GyazoRemoteVerification -DirectImageUrl (
                        [string] $metadata.image_url
                    ) -ExpectedImageId (
                        [string] $metadata.image_id
                    ) -PermalinkUrl (
                        [string] $metadata.page_url
                    ) -ExpectedLength $fileItem.Length -ExpectedSha256 $sha256 -ExpectedLiteralPath $publication.FullName
                    Invoke-GyazoMetadataVerification -ImageId (
                        [string] $metadata.image_id
                    ) -Token $token -ExpectedMetadata $uploadMetadata -ExpectedCreatedAt $createdAt
                    ConvertTo-GyazoJournalStatus -Entry $journalRecord -Status 'verified' -Metadata $metadata
                    Write-AtomicJsonFile -InputObject $journal -LiteralPath $journalPath
                }

                foreach ($occurrence in $group.Group) {
                    Merge-GyazoRecord -Photo $occurrence.Photo -Metadata $metadata -PublicationName $publication.PublicationName
                    if ($ReplaceExistingFromSources) {
                        if ($source.IsPrivate) {
                            $declaredSource = [string](
                                Get-ObjectPropertyValue -InputObject $occurrence.Photo -Name 'source_file'
                            )
                            if (
                                $declaredSource -match '^\.private-photo-sources/'
                            ) {
                                $occurrence.Photo.PSObject.Properties.Remove(
                                    'source_file'
                                )
                            }
                            $occurrence.Photo
                                | Add-Member -MemberType NoteProperty -Name 'source_note' -Value $script:PrivateSourceNote -Force
                        }
                        else {
                            $occurrence.Photo
                                | Add-Member -MemberType NoteProperty -Name 'source_file' -Value (
                                    Get-RepositoryRelativePath -LiteralPath $source.FullName -RepositoryRoot $repositoryRoot
                                ) -Force
                            $occurrence.Photo.PSObject.Properties.Remove(
                                'source_note'
                            )
                        }
                    }
                }
                $results.Add(
                    (
                        ConvertTo-PublishResult -PlantSlug $representative.PlantSlug -File $publication.PublicationName -Metadata $metadata -Status $status -ReferenceCount $group.Count
                    )
                )
            }
            finally {
                Clear-ValidatedTempDirectory -LiteralPath $tempDirectory
            }
        }

        Assert-ManifestHash -ManifestPath $manifestPath -ExpectedHash $initialManifestHash
        Write-AtomicJsonFile -InputObject $manifest -LiteralPath $manifestPath
        if (Test-Path -LiteralPath $journalPath) {
            Remove-Item -LiteralPath $journalPath -Force -Confirm:$false -ErrorAction Stop
        }

        if (-not $ReplaceExistingFromSources -and -not $KeepLocalFiles) {
            foreach ($group in $groups) {
                $publicationPath = Join-Path -Path $repositoryRoot -ChildPath $group.Name
                $resolvedPublication = Resolve-RepositoryPhotoPath -LiteralPath $publicationPath -RepositoryRoot $repositoryRoot
                if (
                    $resolvedPublication.IsPrivate -or
                    -not (
                        Test-ContainedPath -LiteralPath $resolvedPublication.FullName -RootPath $collectionPhotoRoot
                    )
                ) {
                    throw (
                        Get-PublishException -Message "Refusing to remove an unvalidated legacy publication: '$($group.Name)'." -ErrorId 'ManifestPublicationPathInvalid'
                    )
                }
                Remove-Item -LiteralPath $resolvedPublication.FullName -Force -Confirm:$false -ErrorAction Stop
            }
        }

        if ($PassThru) {
            $results
        }
    }
}
catch {
    $errorId = [string] $_.Exception.Data['PublishCollectionPhotoErrorId']
    if ([string]::IsNullOrWhiteSpace($errorId)) {
        $errorId = 'PublishCollectionPhotoFailed'
    }

    $errorRecord = [System.Management.Automation.ErrorRecord]::new(
        $_.Exception,
        $errorId,
        [System.Management.Automation.ErrorCategory]::InvalidOperation,
        $null
    )
    $PSCmdlet.ThrowTerminatingError($errorRecord)
}
finally {
    Exit-GyazoPublicationLock -Lock $operationLock
}
