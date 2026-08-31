class GardenPhotoPublisherTestState {
    static [hashtable] $MetadataByImageId = @{}
    static [hashtable] $UploadedBytesByImageId = @{}
    static [byte[]] $LastUploadedBytes
    static [string] $FailVerificationImageId
    static [bool] $FailVerificationOnce
}

BeforeAll {
    $script:SourceScriptPath = (
        Resolve-Path -LiteralPath (
            Join-Path -Path $PSScriptRoot -ChildPath '../../scripts/publish-collection-photo.ps1'
        )
    ).ProviderPath

    function Write-TestWebP {
        param(
            [Parameter(Mandatory)]
            [string] $LiteralPath,
            [string] $ExifText,
            [string] $XmpText
        )

        $chunk = {
            param(
                [string] $FourCC,
                [byte[]] $Payload
            )

            $size = [System.BitConverter]::GetBytes([uint32] $Payload.Length)
            if (-not [System.BitConverter]::IsLittleEndian) {
                [System.Array]::Reverse($size)
            }
            $padding = if ($Payload.Length % 2) {
                [byte[]](0)
            } else {
                [byte[]] @()
            }
            return [byte[]](
                [System.Text.Encoding]::ASCII.GetBytes($FourCC) +
                $size +
                $Payload +
                $padding
            )
        }
        $privateMetadataPresent =
        -not [string]::IsNullOrWhiteSpace($ExifText) -or
        -not [string]::IsNullOrWhiteSpace($XmpText)
        $vp8xPayload = [byte[]](
            $(
                if ($privateMetadataPresent) {
                    0x0c
                } else {
                    0x00
                }
            ),
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00
        )
        $chunks = [byte[]](
            & $chunk 'VP8X' $vp8xPayload
        )
        if (-not [string]::IsNullOrWhiteSpace($ExifText)) {
            $chunks += & $chunk 'EXIF'(
                [System.Text.Encoding]::UTF8.GetBytes($ExifText)
            )
        }
        if (-not [string]::IsNullOrWhiteSpace($XmpText)) {
            $chunks += & $chunk 'XMP '(
                [System.Text.Encoding]::UTF8.GetBytes($XmpText)
            )
        }
        $chunks += & $chunk 'VP8L'([byte[]]( 0x2f, 0x00, 0x00, 0x00, 0x00 ))
        $riffLength = [System.BitConverter]::GetBytes(
            [uint32](4 + $chunks.Length)
        )
        if (-not [System.BitConverter]::IsLittleEndian) {
            [System.Array]::Reverse($riffLength)
        }
        $bytes = [byte[]](
            [System.Text.Encoding]::ASCII.GetBytes('RIFF') +
            $riffLength +
            [System.Text.Encoding]::ASCII.GetBytes('WEBP') +
            $chunks
        )
        [System.IO.File]::WriteAllBytes( $LiteralPath, $bytes )
    }

    function Write-TestJpeg {
        param(
            [Parameter(Mandatory)]
            [string] $LiteralPath
        )

        $orientationSegment = [byte[]](
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
            0x06,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00
        )
        $segment = {
            param(
                [byte] $Marker,
                [byte[]] $Payload
            )

            $length = $Payload.Length + 2
            return [byte[]](
                0xff,
                $Marker,
                [byte]($length -shr 8),
                [byte]($length -band 0xff)
            ) + $Payload
        }
        $iccSegment = & $segment 0xe2(
            [byte[]](
                [System.Text.Encoding]::ASCII.GetBytes("ICC_PROFILE`0") +
                [byte[]]( 0x01, 0x01, 0x10, 0x20 )
            )
        )
        $mpfSegment = & $segment 0xe2(
            [System.Text.Encoding]::ASCII.GetBytes("MPF`0PRIVATE-AUXILIARY")
        )
        $privateAppData = [System.Text.Encoding]::ASCII.GetBytes(
            'PRIVATE-GPS-METADATA'
        )
        $appSegment = & $segment 0xed $privateAppData
        $comment = [System.Text.Encoding]::ASCII.GetBytes('PRIVATE-COMMENT')
        $commentSegment = & $segment 0xfe $comment
        $scanHeader = [byte[]](
            0xff,
            0xda,
            0x00,
            0x08,
            0x01,
            0x01,
            0x00,
            0x00,
            0x3f,
            0x00,
            0x11,
            0x22,
            0x33
        )
        $betweenScanMetadata = & $segment 0xed(
            [System.Text.Encoding]::ASCII.GetBytes('PRIVATE-BETWEEN-SCANS')
        )
        $secondScan = [byte[]](
            0xff,
            0xda,
            0x00,
            0x08,
            0x01,
            0x01,
            0x00,
            0x00,
            0x3f,
            0x00,
            0x44,
            0x55,
            0xff,
            0x00,
            0x66,
            0xff,
            0xd9
        )
        $trailer = [byte[]](
            [System.Text.Encoding]::ASCII.GetBytes(
                'SAMSUNG-SEF-Image_UTC_Data'
            ) +
            [byte[]]( 0xff, 0xd8, 0xff, 0xd9 )
        )
        [System.IO.File]::WriteAllBytes(
            $LiteralPath,
            [byte[]]( 0xff, 0xd8 ) +
            $orientationSegment +
            $iccSegment +
            $mpfSegment +
            $appSegment +
            $commentSegment +
            $scanHeader +
            $betweenScanMetadata +
            $secondScan +
            $trailer
        )
    }

    function Write-TestPng {
        param(
            [Parameter(Mandatory)]
            [string] $LiteralPath
        )

        $magick = Get-Command -Name magick -CommandType Application -ErrorAction Stop
        $nativeOutput = & $magick.Source -size '64x48' 'gradient:#18304d-#e6c05b' -strip -define 'png:exclude-chunk=date,time' -define 'png:compression-level=9' $LiteralPath 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "ImageMagick failed to create the PNG test fixture: $($nativeOutput | Out-String)"
        }
    }

    function Initialize-TestRepository {
        param(
            [Parameter(Mandatory)]
            [object[]] $Plants,
            [object[]] $CollectionOverviews = @()
        )

        $repositoryRoot = Join-Path -Path $TestDrive -ChildPath (
            [guid]::NewGuid().ToString('N')
        )
        $scriptDirectory = Join-Path -Path $repositoryRoot -ChildPath 'scripts'
        $photoDirectory = Join-Path -Path $repositoryRoot -ChildPath 'assets/collection-photos'
        $privateDirectory = Join-Path -Path $repositoryRoot -ChildPath '.private-photo-sources'
        $null = New-Item -ItemType Directory -Path $scriptDirectory, $photoDirectory, $privateDirectory -Force
        $scriptPath = Join-Path -Path $scriptDirectory -ChildPath 'publish-collection-photo.ps1'
        Copy-Item -LiteralPath $script:SourceScriptPath -Destination $scriptPath

        $manifest = [pscustomobject] [ordered] @{
            schema_version = 3
            gyazo_collection =
                [pscustomobject] [ordered] @{
                    id = 'collection-test-id'
                    url = 'https://gyazo.com/collections/collection-test-id'
                }
            collection_overviews = $CollectionOverviews
            plants = $Plants
        }
        $manifestPath = Join-Path -Path $photoDirectory -ChildPath 'photo-manifest.json'
        [System.IO.File]::WriteAllText(
            $manifestPath,
            ($manifest | ConvertTo-Json -Depth 20) + "`n",
            [System.Text.UTF8Encoding]::new($false)
        )

        return [pscustomobject] @{
            Root = $repositoryRoot
            ScriptPath = $scriptPath
            PhotoDirectory = $photoDirectory
            PrivateDirectory = $privateDirectory
            SourceMapPath =
                Join-Path -Path $privateDirectory -ChildPath 'photo-source-map.json'
            ManifestPath = $manifestPath
            JournalPath =
                Join-Path -Path $photoDirectory -ChildPath '.gyazo-migration-journal.json'
            SingleJournalPath =
                Join-Path -Path $photoDirectory -ChildPath '.gyazo-single-upload-journal.json'
        }
    }

    function ConvertTo-TestPlant {
        param(
            [Parameter(Mandatory)]
            [string] $PlantSlug,
            [object[]] $Photos = @(),
            [string] $CollectionId
        )

        $plant = [pscustomobject] [ordered] @{
            plant_slug = $PlantSlug
            photos = $Photos
        }
        if (-not [string]::IsNullOrWhiteSpace($CollectionId)) {
            $plant
                | Add-Member -MemberType NoteProperty -Name 'gyazo_collection' -Value (
                    [pscustomobject] [ordered] @{
                        id = $CollectionId
                        url = "https://gyazo.com/collections/$CollectionId"
                    }
                )
        }
        return $plant
    }

    function ConvertTo-TestPhoto {
        param(
            [Parameter(Mandatory)]
            [string] $File,
            [string] $Alt = 'Test plant photo',
            [string] $SourceFile = $File,
            [string] $CapturedOn = '2026-08-30',
            [string] $DerivedNote
        )

        $photo = [pscustomobject] [ordered] @{
            file = $File
            source_file = $SourceFile
            kind = 'collection'
            captured_on = $CapturedOn
            view = 'top'
            alt = $Alt
            caption = 'Test caption.'
        }
        if (-not [string]::IsNullOrWhiteSpace($DerivedNote)) {
            $photo
                | Add-Member -MemberType NoteProperty -Name 'derived_note' -Value $DerivedNote
        }
        return $photo
    }

    function Get-TestImageId {
        param(
            [Parameter(Mandatory)]
            [string] $Name
        )

        $bytes = [System.Text.Encoding]::UTF8.GetBytes($Name)
        $hash = [System.Security.Cryptography.SHA256]::HashData($bytes)
        return [System.Convert]::ToHexString($hash).Substring(
            0,
            32
        ).ToLowerInvariant()
    }

    function Get-SingleParameterSet {
        param(
            [Parameter(Mandatory)]
            [string] $LiteralPath
        )

        return @{
            PlantSlug = 'test-plant'
            LiteralPath = $LiteralPath
            CapturedOn = '2026-08-30'
            View = 'top'
            AltText = 'Top view of the test plant'
            Caption = 'Test plant on August 30, 2026.'
            Confirm = $false
        }
    }

    Set-Alias -Name New-TestRepository -Value Initialize-TestRepository
    Set-Alias -Name New-TestPlant -Value ConvertTo-TestPlant
    Set-Alias -Name New-TestPhoto -Value ConvertTo-TestPhoto
    Set-Alias -Name Get-SingleParameters -Value Get-SingleParameterSet
}

Describe 'publish-collection-photo.ps1' {
    BeforeEach {
        $script:OriginalToken = $env:GYAZO_OAUTH_ACCESS_TOKEN
        $env:GYAZO_OAUTH_ACCESS_TOKEN = [System.String]::Concat(
            'test-',
            'token-',
            'sentinel'
        )
        [GardenPhotoPublisherTestState]::MetadataByImageId = @{}
        [GardenPhotoPublisherTestState]::UploadedBytesByImageId = @{}
        [GardenPhotoPublisherTestState]::LastUploadedBytes = $null
        [GardenPhotoPublisherTestState]::FailVerificationImageId = $null
        [GardenPhotoPublisherTestState]::FailVerificationOnce = $false

        Mock Invoke-RestMethod {
            param(
                $Form,
                $Method,
                $Uri
            )

            if ([string] $Method -eq 'Get') {
                $imageId = ([uri] $Uri).AbsolutePath.Trim('/').Split('/')[- 1]
                $savedMetadata = [GardenPhotoPublisherTestState]::MetadataByImageId[
                    $imageId
                ]
                return [pscustomobject] @{
                    image_id = $imageId
                    created_at =
                        [DateTimeOffset]::FromUnixTimeSeconds(
                            [long] $savedMetadata.created_at
                        ).ToString('o')
                    metadata =
                        [pscustomobject] @{
                            app = $savedMetadata.app
                            title = $savedMetadata.title
                            url = $savedMetadata.url
                            desc = $savedMetadata.desc
                        }
                }
            }

            [GardenPhotoPublisherTestState]::LastUploadedBytes = [System.IO.File]::ReadAllBytes(
                $Form.imagedata.FullName
            )
            $leafName = [System.IO.Path]::GetFileName($Form.imagedata.FullName)
            $imageId = Get-TestImageId -Name $leafName
            [GardenPhotoPublisherTestState]::UploadedBytesByImageId[$imageId] =
            [GardenPhotoPublisherTestState]::LastUploadedBytes
            [GardenPhotoPublisherTestState]::MetadataByImageId[$imageId] = @{
                app = $Form.app
                title = $Form.title
                url = $Form.referer_url
                desc = $Form.desc
                created_at = $Form.created_at
            }
            $imageType = [System.IO.Path]::GetExtension($leafName).TrimStart(
                '.'
            )
            [pscustomobject] @{
                image_id = $imageId
                permalink_url = "https://gyazo.com/$imageId"
                thumb_url = "https://i.gyazo.com/thumb/$imageId.$imageType"
                url = "https://i.gyazo.com/$imageId.$imageType"
                type = $imageType
            }
        }
        Mock Invoke-WebRequest {
            param($Uri)

            $imageId = [System.IO.Path]::GetFileNameWithoutExtension(
                ([uri] $Uri).AbsolutePath
            )
            $uploadedBytes = [byte[]](
                [GardenPhotoPublisherTestState]::UploadedBytesByImageId[
                    $imageId
                ]
            )
            [pscustomobject] @{
                StatusCode = 200
                Headers = @{ 'Content-Type' = 'image/test' }
                RawContentLength = $uploadedBytes.Length
                Content = $uploadedBytes
            }
        }
    }

    AfterEach {
        $env:GYAZO_OAUTH_ACCESS_TOKEN = $script:OriginalToken
    }

    Context 'validation and WhatIf safety' {
        It 'fails with a stable error when the process token is missing' {
            $repository = New-TestRepository -Plants @(
                (New-TestPlant -PlantSlug 'test-plant')
            )
            $photoPath = Join-Path -Path $repository.PhotoDirectory -ChildPath 'missing-token.webp'
            Write-TestWebP -LiteralPath $photoPath
            $env:GYAZO_OAUTH_ACCESS_TOKEN = $null
            $parameters = Get-SingleParameters -LiteralPath $photoPath

            $caught = try {
                & $repository.ScriptPath @parameters
                $null
            }
            catch {
                $_
            }

            $caught.FullyQualifiedErrorId
                | Should -Match '^GyazoAccessTokenMissing'
            Should -Invoke Invoke-RestMethod -Times 0 -Exactly
        }

        It 'rejects a missing input path before any HTTP call' {
            $repository = New-TestRepository -Plants @(
                (New-TestPlant -PlantSlug 'test-plant')
            )
            $missingPath = Join-Path -Path $repository.PhotoDirectory -ChildPath 'does-not-exist.webp'
            $parameters = Get-SingleParameters -LiteralPath $missingPath

            {
                & $repository.ScriptPath @parameters
            }
                | Should -Throw
            Should -Invoke Invoke-RestMethod -Times 0 -Exactly
            Should -Invoke Invoke-WebRequest -Times 0 -Exactly
        }

        It 'rejects an existing path outside the two authorized roots' {
            $repository = New-TestRepository -Plants @(
                (New-TestPlant -PlantSlug 'test-plant')
            )
            $outsidePath = Join-Path -Path $repository.Root -ChildPath 'outside.webp'
            Write-TestWebP -LiteralPath $outsidePath
            $parameters = Get-SingleParameters -LiteralPath $outsidePath

            $caught = try {
                & $repository.ScriptPath @parameters
                $null
            }
            catch {
                $_
            }

            $caught.FullyQualifiedErrorId
                | Should -Match '^PhotoPathOutsideAllowedRoots'
            Should -Invoke Invoke-RestMethod -Times 0 -Exactly
        }

        It 'performs no upload, verification, or manifest write under WhatIf' {
            $repository = New-TestRepository -Plants @(
                (New-TestPlant -PlantSlug 'test-plant')
            )
            $photoPath = Join-Path -Path $repository.PhotoDirectory -ChildPath 'what-if.webp'
            Write-TestWebP -LiteralPath $photoPath
            $manifestBefore = [System.IO.File]::ReadAllBytes(
                $repository.ManifestPath
            )
            $env:GYAZO_OAUTH_ACCESS_TOKEN = $null
            $parameters = Get-SingleParameters -LiteralPath $photoPath
            $parameters.WhatIf = $true

            $result = & $repository.ScriptPath @parameters

            $result | Should -BeNullOrEmpty
            [System.Convert]::ToBase64String(
                [System.IO.File]::ReadAllBytes($repository.ManifestPath)
            )
                | Should -Be ([System.Convert]::ToBase64String($manifestBefore))
            Should -Invoke Invoke-RestMethod -Times 0 -Exactly
            Should -Invoke Invoke-WebRequest -Times 0 -Exactly
        }
    }

    Context 'upload and verification failures' {
        It 'journals an ambiguous upload failure and refuses a duplicate POST' {
            $repository = New-TestRepository -Plants @(
                (New-TestPlant -PlantSlug 'test-plant')
            )
            $photoPath = Join-Path -Path $repository.PhotoDirectory -ChildPath 'api-failure.webp'
            Write-TestWebP -LiteralPath $photoPath
            $manifestBefore = [System.IO.File]::ReadAllBytes(
                $repository.ManifestPath
            )
            Mock Invoke-RestMethod {
                throw 'simulated API failure'
            }
            $parameters = Get-SingleParameters -LiteralPath $photoPath

            {
                & $repository.ScriptPath @parameters
            }
                | Should -Throw -ExpectedMessage '*Gyazo upload failed*'

            [System.Convert]::ToBase64String(
                [System.IO.File]::ReadAllBytes($repository.ManifestPath)
            )
                | Should -Be ([System.Convert]::ToBase64String($manifestBefore))
            $repository.SingleJournalPath | Should -Exist
            $journal = Get-Content -LiteralPath $repository.SingleJournalPath -Raw
                | ConvertFrom-Json -Depth 20
            $journal.schema_version | Should -Be 2
            @($journal.entries).Count | Should -Be 1
            $journal.entries[0].status | Should -Be 'ambiguous'
            {
                & $repository.ScriptPath @parameters
            }
                | Should -Throw -ExpectedMessage '*ambiguous outcome*'
            Should -Invoke Invoke-RestMethod -Times 1 -Exactly
            Should -Invoke Invoke-WebRequest -Times 0 -Exactly
        }

        It 'rejects a remote URL that is not a non-empty image response' {
            $repository = New-TestRepository -Plants @(
                (New-TestPlant -PlantSlug 'test-plant')
            )
            $photoPath = Join-Path -Path $repository.PhotoDirectory -ChildPath 'bad-remote.webp'
            Write-TestWebP -LiteralPath $photoPath
            $manifestBefore = [System.IO.File]::ReadAllBytes(
                $repository.ManifestPath
            )
            Mock Invoke-WebRequest {
                [pscustomobject] @{
                    StatusCode = 200
                    Headers = @{ 'Content-Type' = 'text/html' }
                    RawContentLength = 12
                    Content = 'not an image'
                }
            }
            $parameters = Get-SingleParameters -LiteralPath $photoPath

            $caught = try {
                & $repository.ScriptPath @parameters
                $null
            }
            catch {
                $_
            }

            $caught.FullyQualifiedErrorId
                | Should -Match '^GyazoRemoteVerificationFailed'
            [System.Convert]::ToBase64String(
                [System.IO.File]::ReadAllBytes($repository.ManifestPath)
            )
                | Should -Be ([System.Convert]::ToBase64String($manifestBefore))
        }

        It 'rejects a direct image URL whose path does not match the returned image ID' {
            $repository = New-TestRepository -Plants @(
                (New-TestPlant -PlantSlug 'test-plant')
            )
            $photoPath = Join-Path -Path $repository.PhotoDirectory -ChildPath 'mismatched-id.webp'
            Write-TestWebP -LiteralPath $photoPath
            Mock Invoke-RestMethod {
                [pscustomobject] @{
                    image_id = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
                    permalink_url =
                        'https://gyazo.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
                    url =
                        'https://i.gyazo.com/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.webp'
                    type = 'webp'
                }
            }
            $parameters = Get-SingleParameters -LiteralPath $photoPath

            $caught = try {
                & $repository.ScriptPath @parameters
                $null
            }
            catch {
                $_
            }

            $caught.FullyQualifiedErrorId
                | Should -Match '^GyazoDirectUrlInvalid'
            Should -Invoke Invoke-WebRequest -Times 0 -Exactly
        }

        It 'rejects a permalink whose path does not match the returned image ID' {
            $repository = New-TestRepository -Plants @(
                (New-TestPlant -PlantSlug 'test-plant')
            )
            $photoPath = Join-Path -Path $repository.PhotoDirectory -ChildPath 'bad-permalink.webp'
            Write-TestWebP -LiteralPath $photoPath
            Mock Invoke-RestMethod {
                [pscustomobject] @{
                    image_id = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
                    permalink_url =
                        'https://gyazo.com/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
                    url =
                        'https://i.gyazo.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp'
                    type = 'webp'
                }
            }
            $parameters = Get-SingleParameters -LiteralPath $photoPath

            $caught = try {
                & $repository.ScriptPath @parameters
                $null
            }
            catch {
                $_
            }

            $caught.FullyQualifiedErrorId
                | Should -Match '^GyazoPermalinkInvalid'
            Should -Invoke Invoke-WebRequest -Times 0 -Exactly
        }

        It 'redacts a token even when the HTTP boundary echoes it in an exception' {
            $repository = New-TestRepository -Plants @(
                (New-TestPlant -PlantSlug 'test-plant')
            )
            $photoPath = Join-Path -Path $repository.PhotoDirectory -ChildPath 'redaction.webp'
            Write-TestWebP -LiteralPath $photoPath
            $secret = $env:GYAZO_OAUTH_ACCESS_TOKEN
            Mock Invoke-RestMethod {
                throw "server echoed $env:GYAZO_OAUTH_ACCESS_TOKEN"
            }
            $parameters = Get-SingleParameters -LiteralPath $photoPath

            $caught = try {
                & $repository.ScriptPath @parameters
                $null
            }
            catch {
                $_ | Out-String
            }

            $caught | Should -Not -Match ([regex]::Escape($secret))
            $caught | Should -Match 'Gyazo upload failed'
        }

        It 'removes only its validated operation temp directory after failure' {
            $repository = New-TestRepository -Plants @(
                (New-TestPlant -PlantSlug 'test-plant')
            )
            $photoPath = Join-Path -Path $repository.PhotoDirectory -ChildPath 'cleanup.webp'
            Write-TestWebP -LiteralPath $photoPath
            $parameters = Get-SingleParameters -LiteralPath $photoPath
            $tempRoot = Join-Path -Path (
                [System.IO.Path]::GetTempPath()
            ) -ChildPath 'Gardening-Gyazo'
            $before = @(
                Get-ChildItem -LiteralPath $tempRoot -Directory -ErrorAction SilentlyContinue |
                Select-Object -ExpandProperty FullName
            )
            Mock Invoke-RestMethod {
                throw 'simulated API failure'
            }

            {
                & $repository.ScriptPath @parameters
            }
                | Should -Throw

            $after = @(
                Get-ChildItem -LiteralPath $tempRoot -Directory -ErrorAction SilentlyContinue |
                Select-Object -ExpandProperty FullName
            )
            $after | Should -Be $before
        }

        It 'keeps a private WebP source without leaving a publication binary after upload failure' {
            $repository = New-TestRepository -Plants @(
                (New-TestPlant -PlantSlug 'test-plant')
            )
            $privateSourcePath = Join-Path -Path $repository.PrivateDirectory -ChildPath 'camera source.webp'
            $publicationPath = Join-Path -Path $repository.PhotoDirectory -ChildPath '2026-08-30-test-plant-top.webp'
            Write-TestWebP -LiteralPath $privateSourcePath
            $parameters = Get-SingleParameters -LiteralPath $privateSourcePath
            Mock Invoke-RestMethod {
                throw 'simulated API failure'
            }

            {
                & $repository.ScriptPath @parameters
            }
                | Should -Throw

            $privateSourcePath | Should -Exist
            $publicationPath | Should -Not -Exist
        }
    }

    Context 'successful output and shared publications' {
        It 'returns one stable structured object only when PassThru is requested' {
            $repository = New-TestRepository -Plants @(
                (New-TestPlant -PlantSlug 'test-plant')
            )
            $photoPath = Join-Path -Path $repository.PhotoDirectory -ChildPath 'successful.webp'
            Write-TestWebP -LiteralPath $photoPath
            $parameters = Get-SingleParameters -LiteralPath $photoPath
            $parameters.PassThru = $true

            $result = & $repository.ScriptPath @parameters
            $manifest = Get-Content -LiteralPath $repository.ManifestPath -Raw
                | ConvertFrom-Json -Depth 20
            $photo = $manifest.plants[0].photos[0]

            @($result).Count | Should -Be 1
            $result.PSObject.TypeNames
                | Should -Contain 'Gardening.GyazoPhotoPublication'
            $result.PSObject.Properties.Name
                | Should -Be @(
                    'PlantSlug',
                    'File',
                    'ImageId',
                    'PermalinkUrl',
                    'Url',
                    'Type',
                    'CollectionId',
                    'Status',
                    'ReferenceCount'
                )
            $result.Status | Should -Be 'Uploaded'
            $result.CollectionId | Should -Be 'collection-test-id'
            $result.ReferenceCount | Should -Be 1
            $photo.publication_name
                | Should -Be '2026-08-30-test-plant-top.webp'
            $photo.provider | Should -Be 'gyazo'
            $photo.image_id | Should -Be $result.ImageId
            $photo.image_url | Should -Be $result.Url
            $photo.page_url | Should -Be $result.PermalinkUrl
            $photo.upload_metadata.app | Should -Be 'Fenton Garden Field Guide'
            $photo.upload_metadata.title
                | Should -Be 'Top view of the test plant'
            $photo.upload_metadata.url
                | Should -Be 'https://nick2bad4u.github.io/Gardening/#test-plant'
            $photo.upload_metadata.desc
                | Should -Match 'Copyright Nick; all rights reserved'
            $photo.PSObject.Properties.Name | Should -Not -Contain 'file'
            $photo.PSObject.Properties.Name | Should -Not -Contain 'source_file'
            $photo.PSObject.Properties.Name | Should -Not -Contain 'gyazo'
            $photoPath | Should -Exist
            Should -Invoke Invoke-RestMethod -Times 1 -Exactly -ParameterFilter {
                [string] $Method -eq 'Post' -and
                $Headers.Authorization -eq "Bearer $env:GYAZO_OAUTH_ACCESS_TOKEN" -and
                $Form.access_policy -eq 'anyone' -and
                $Form.metadata_is_public -eq 'true' -and
                $Form.collection_id -eq 'collection-test-id' -and
                $Form.created_at -eq '1788048000' -and
                $Form.app -eq 'Fenton Garden Field Guide' -and
                $Form.title -eq 'Top view of the test plant' -and
                $Form.referer_url -eq 'https://nick2bad4u.github.io/Gardening/#test-plant' -and
                $Form.desc -match 'Test plant on August 30, 2026' -and
                $Form.imagedata.Name -eq '2026-08-30-test-plant-top.webp'
            }
            Should -Invoke Invoke-RestMethod -Times 1 -Exactly -ParameterFilter {
                [string] $Method -eq 'Get' -and
                ([uri] $Uri).Host -eq 'api.gyazo.com'
            }
        }

        It 'accepts Gyazo container normalization only when dimensions and structural similarity are preserved' {
            $repository = New-TestRepository -Plants @(
                (New-TestPlant -PlantSlug 'test-plant')
            )
            $privateSourcePath = Join-Path -Path $repository.PrivateDirectory -ChildPath 'camera source.png'
            Write-TestPng -LiteralPath $privateSourcePath
            Mock Invoke-WebRequest {
                param($Uri)

                $imageId = [System.IO.Path]::GetFileNameWithoutExtension(
                    ([uri] $Uri).AbsolutePath
                )
                $uploadedBytes = [byte[]](
                    [GardenPhotoPublisherTestState]::UploadedBytesByImageId[
                        $imageId
                    ]
                )
                $inputPath = Join-Path -Path $TestDrive -ChildPath "$imageId-input.png"
                $outputPath = Join-Path -Path $TestDrive -ChildPath "$imageId-normalized.png"
                [System.IO.File]::WriteAllBytes( $inputPath, $uploadedBytes )
                $magick = Get-Command -Name magick -CommandType Application -ErrorAction Stop
                $null = & $magick.Source $inputPath -strip -define 'png:exclude-chunk=date,time' -define 'png:compression-level=1' $outputPath 2>&1
                if ($LASTEXITCODE -ne 0) {
                    throw 'ImageMagick failed to normalize the mock Gyazo response.'
                }
                $normalizedBytes = [System.IO.File]::ReadAllBytes($outputPath)
                [pscustomobject] @{
                    StatusCode = 200
                    Headers = @{ 'Content-Type' = 'image/png' }
                    RawContentLength = $normalizedBytes.Length
                    Content = $normalizedBytes
                }
            }
            $parameters = Get-SingleParameters -LiteralPath $privateSourcePath

            $null = & $repository.ScriptPath @parameters
            $manifest = Get-Content -LiteralPath $repository.ManifestPath -Raw
                | ConvertFrom-Json -Depth 20

            $manifest.plants[0].photos[0].publication_name
                | Should -Be '2026-08-30-test-plant-top.png'
            $repository.SingleJournalPath | Should -Not -Exist
            Should -Invoke Invoke-WebRequest -Times 1 -Exactly
        }

        It 'strips private WebP metadata without re-encoding image chunks and cleans the derivative' {
            $repository = New-TestRepository -Plants @(
                (New-TestPlant -PlantSlug 'test-plant')
            )
            $privateSourcePath = Join-Path -Path $repository.PrivateDirectory -ChildPath 'camera source.webp'
            $persistentPublicationPath = Join-Path -Path $repository.PhotoDirectory -ChildPath '2026-08-30-test-plant-top.webp'
            Write-TestWebP -LiteralPath $privateSourcePath -ExifText 'PRIVATE-WEBP-EXIF' -XmpText 'PRIVATE-WEBP-XMP'
            $parameters = Get-SingleParameters -LiteralPath $privateSourcePath

            $null = & $repository.ScriptPath @parameters
            $manifest = Get-Content -LiteralPath $repository.ManifestPath -Raw
                | ConvertFrom-Json -Depth 20

            $privateSourcePath | Should -Exist
            $persistentPublicationPath | Should -Not -Exist
            $manifest.plants[0].photos[0].publication_name
                | Should -Be '2026-08-30-test-plant-top.webp'
            $manifest.plants[0].photos[0].source_note
                | Should -Match 'path is intentionally excluded'
            $manifest.plants[0].photos[0].PSObject.Properties.Name
                | Should -Not -Contain 'source_file'
            [System.Text.Encoding]::ASCII.GetString(
                [GardenPhotoPublisherTestState]::LastUploadedBytes
            )
                | Should -Not -Match 'PRIVATE-WEBP-(?:EXIF|XMP)'
            [System.Text.Encoding]::ASCII.GetString(
                [GardenPhotoPublisherTestState]::LastUploadedBytes
            )
                | Should -Match 'VP8L'
            Should -Invoke Invoke-RestMethod -Times 1 -Exactly -ParameterFilter {
                [string] $Method -eq 'Post' -and
                $Form.imagedata.Name -eq '2026-08-30-test-plant-top.webp' -and
                $Form.imagedata.FullName.StartsWith(
                    (
                        Join-Path -Path (
                            [System.IO.Path]::GetTempPath()
                        ) -ChildPath 'Gardening-Gyazo'
                    ),
                    [System.StringComparison]::OrdinalIgnoreCase
                )
            }
        }

        It 'preserves JPEG image scan bytes while removing private metadata and retaining orientation' {
            $repository = New-TestRepository -Plants @(
                (New-TestPlant -PlantSlug 'test-plant')
            )
            $privateSourcePath = Join-Path -Path $repository.PrivateDirectory -ChildPath 'camera source.jpg'
            Write-TestJpeg -LiteralPath $privateSourcePath
            $parameters = Get-SingleParameters -LiteralPath $privateSourcePath

            $null = & $repository.ScriptPath @parameters
            $manifest = Get-Content -LiteralPath $repository.ManifestPath -Raw
                | ConvertFrom-Json -Depth 20
            $photo = $manifest.plants[0].photos[0]
            $uploadedText = [System.Text.Encoding]::ASCII.GetString(
                [GardenPhotoPublisherTestState]::LastUploadedBytes
            )
            $uploadedHex = [System.Convert]::ToHexString(
                [GardenPhotoPublisherTestState]::LastUploadedBytes
            )

            $privateSourcePath | Should -Exist
            $photo.publication_name | Should -Be '2026-08-30-test-plant-top.jpg'
            $photo.PSObject.Properties.Name | Should -Not -Contain 'source_file'
            $photo.source_note | Should -Match 'path is intentionally excluded'
            $uploadedText | Should -Not -Match 'PRIVATE-GPS-METADATA'
            $uploadedText | Should -Not -Match 'PRIVATE-COMMENT'
            $uploadedText | Should -Not -Match 'PRIVATE-BETWEEN-SCANS'
            $uploadedText | Should -Not -Match 'PRIVATE-AUXILIARY'
            $uploadedText | Should -Not -Match 'SAMSUNG-SEF'
            $uploadedText | Should -Match "Exif`0`0"
            $uploadedText | Should -Match "ICC_PROFILE`0"
            $uploadedHex
                | Should -Match '112233FFDA0008010100003F004455FF0066FFD9$'
            Should -Invoke Invoke-RestMethod -Times 1 -Exactly -ParameterFilter {
                [string] $Method -eq 'Post' -and
                $Form.imagedata.Name -eq '2026-08-30-test-plant-top.jpg'
            }
        }

        It 'replaces an existing derivative capture from an ignored private mapping without exposing its path' {
            $oldImageId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
            $photo = [pscustomobject] [ordered] @{
                publication_name = '2026-08-30-test-plant-top.webp'
                provider = 'gyazo'
                image_id = $oldImageId
                image_url = "https://i.gyazo.com/$oldImageId.webp"
                page_url = "https://gyazo.com/$oldImageId"
                kind = 'collection'
                captured_on = '2026-08-30'
                view = 'top'
                alt = 'Top view of the source-quality test plant'
                caption = 'Source-quality replacement test.'
            }
            $repository = New-TestRepository -Plants @(
                (New-TestPlant -PlantSlug 'test-plant' -Photos @($photo))
            )
            $sourcePath = Join-Path -Path $repository.PrivateDirectory -ChildPath 'source-original.jpg'
            Write-TestJpeg -LiteralPath $sourcePath
            [System.IO.File]::WriteAllText(
                $repository.SourceMapPath,
                (
                    [pscustomobject] [ordered] @{
                        schema_version = 1
                        sources =
                            [pscustomobject] @{
                                '2026-08-30-test-plant-top' =
                                    'source-original.jpg'
                            }
                    } | ConvertTo-Json -Depth 5
                ) + "`n",
                [System.Text.UTF8Encoding]::new($false)
            )

            $result = & $repository.ScriptPath -MigrateManifest -ReplaceExistingFromSources -PassThru -Confirm:$false
            $manifest = Get-Content -LiteralPath $repository.ManifestPath -Raw
                | ConvertFrom-Json -Depth 20
            $replacement = $manifest.plants[0].photos[0]

            @($result).Count | Should -Be 1
            $result.Status | Should -Be 'Uploaded'
            $replacement.image_id | Should -Not -Be $oldImageId
            $replacement.publication_name
                | Should -Be '2026-08-30-test-plant-top.jpg'
            $replacement.PSObject.Properties.Name
                | Should -Not -Contain 'source_file'
            $replacement.source_note
                | Should -Match 'path is intentionally excluded'
            $replacement.upload_metadata.app
                | Should -Be 'Fenton Garden Field Guide'
            $sourcePath | Should -Exist
            Should -Invoke Invoke-RestMethod -Times 0 -Exactly -ParameterFilter {
                [string] $Method -eq 'Delete'
            }
        }

        It 'uses the first shared occurrence collection, reuses flat metadata, and can retain local files' {
            $sharedFile = 'assets/collection-photos/shared.webp'
            $repository = New-TestRepository -Plants @(
                (
                    New-TestPlant -PlantSlug 'first-plant' -Photos @(
                        (
                            New-TestPhoto -File $sharedFile -SourceFile 'assets/measurements/shared-evidence.png' -CapturedOn '2026-08-29' -Alt 'First plant in shared photo' -DerivedNote 'Preserve this derivation note.'
                        )
                    ) -CollectionId 'collection-first'
                ),
                (
                    New-TestPlant -PlantSlug 'second-plant' -Photos @(
                        (
                            New-TestPhoto -File $sharedFile -Alt 'Second plant in shared photo'
                        )
                    ) -CollectionId 'collection-second'
                )
            )
            $sharedPath = Join-Path -Path $repository.PhotoDirectory -ChildPath 'shared.webp'
            Write-TestWebP -LiteralPath $sharedPath

            $result = & $repository.ScriptPath -MigrateManifest -KeepLocalFiles -PassThru -Confirm:$false
            $manifest = Get-Content -LiteralPath $repository.ManifestPath -Raw
                | ConvertFrom-Json -Depth 20
            $firstPhoto = $manifest.plants[0].photos[0]
            $secondPhoto = $manifest.plants[1].photos[0]

            @($result).Count | Should -Be 1
            $result.ReferenceCount | Should -Be 2
            $result.CollectionId | Should -Be 'collection-first'
            $firstPhoto.image_id | Should -Be $secondPhoto.image_id
            $firstPhoto.image_url | Should -Be $secondPhoto.image_url
            $firstPhoto.page_url | Should -Be $secondPhoto.page_url
            $firstPhoto.publication_name | Should -Be 'shared.webp'
            $secondPhoto.publication_name | Should -Be 'shared.webp'
            $firstPhoto.provider | Should -Be 'gyazo'
            $firstPhoto.kind | Should -Be 'collection'
            $firstPhoto.captured_on | Should -Be '2026-08-29'
            $firstPhoto.view | Should -Be 'top'
            $firstPhoto.alt | Should -Be 'First plant in shared photo'
            $firstPhoto.caption | Should -Be 'Test caption.'
            $firstPhoto.derived_note
                | Should -Be 'Preserve this derivation note.'
            $firstPhoto.source_file
                | Should -Be 'assets/measurements/shared-evidence.png'
            $secondPhoto.PSObject.Properties.Name
                | Should -Not -Contain 'source_file'
            $firstPhoto.PSObject.Properties.Name | Should -Not -Contain 'file'
            $firstPhoto.PSObject.Properties.Name | Should -Not -Contain 'gyazo'
            $secondPhoto.PSObject.Properties.Name | Should -Not -Contain 'file'
            $secondPhoto.PSObject.Properties.Name | Should -Not -Contain 'gyazo'
            $sharedPath | Should -Exist
            Should -Invoke Invoke-RestMethod -Times 1 -Exactly -ParameterFilter {
                [string] $Method -eq 'Post' -and
                $Form.collection_id -eq 'collection-first' -and
                $Form.created_at -eq '1787961600'
            }
            Should -Invoke Invoke-WebRequest -Times 1 -Exactly
        }

        It 'uses provided_on for Gyazo created_at when nursery evidence has no capture date' {
            $publicationFile = 'assets/collection-photos/provided-label.webp'
            $photo = New-TestPhoto -File $publicationFile
            $photo.PSObject.Properties.Remove('captured_on')
            $photo
                | Add-Member -MemberType NoteProperty -Name 'provided_on' -Value '2026-08-26'
            $photo.kind = 'nursery-label'
            $repository = New-TestRepository -Plants @(
                (New-TestPlant -PlantSlug 'test-plant' -Photos @($photo))
            )
            $publicationPath = Join-Path -Path $repository.PhotoDirectory -ChildPath 'provided-label.webp'
            Write-TestWebP -LiteralPath $publicationPath

            & $repository.ScriptPath -MigrateManifest -KeepLocalFiles -Confirm:$false
            $manifest = Get-Content -LiteralPath $repository.ManifestPath -Raw
                | ConvertFrom-Json -Depth 20

            $manifest.plants[0].photos[0].provided_on | Should -Be '2026-08-26'
            $publicationPath | Should -Exist
            Should -Invoke Invoke-RestMethod -Times 1 -Exactly -ParameterFilter {
                [string] $Method -eq 'Post' -and
                $Form.created_at -eq '1787702400'
            }
        }
    }

    Context 'bulk journal and atomic migration' {
        It 'keeps the manifest unchanged after verification interruption and resumes without duplicate uploads' {
            $firstFile = 'assets/collection-photos/a.webp'
            $secondFile = 'assets/collection-photos/b.webp'
            $repository = New-TestRepository -Plants @(
                (
                    New-TestPlant -PlantSlug 'first-plant' -Photos @(
                        (New-TestPhoto -File $firstFile)
                    )
                ),
                (
                    New-TestPlant -PlantSlug 'second-plant' -Photos @(
                        (New-TestPhoto -File $secondFile)
                    )
                )
            )
            Write-TestWebP -LiteralPath (
                Join-Path -Path $repository.PhotoDirectory -ChildPath 'a.webp'
            )
            Write-TestWebP -LiteralPath (
                Join-Path -Path $repository.PhotoDirectory -ChildPath 'b.webp'
            )
            $manifestBefore = [System.IO.File]::ReadAllBytes(
                $repository.ManifestPath
            )
            [GardenPhotoPublisherTestState]::FailVerificationImageId =
            Get-TestImageId -Name 'b.webp'
            [GardenPhotoPublisherTestState]::FailVerificationOnce = $true
            Mock Invoke-WebRequest {
                param($Uri)

                $imageId = [System.IO.Path]::GetFileNameWithoutExtension(
                    ([uri] $Uri).AbsolutePath
                )
                if (
                    [GardenPhotoPublisherTestState]::FailVerificationOnce -and
                    $imageId -eq [GardenPhotoPublisherTestState]::FailVerificationImageId
                ) {
                    [GardenPhotoPublisherTestState]::FailVerificationOnce = $false
                    return [pscustomobject] @{
                        StatusCode = 200
                        Headers = @{ 'Content-Type' = 'text/html' }
                        RawContentLength = 12
                        Content = 'not an image'
                    }
                }
                $uploadedBytes = [byte[]](
                    [GardenPhotoPublisherTestState]::UploadedBytesByImageId[
                        $imageId
                    ]
                )
                return [pscustomobject] @{
                    StatusCode = 200
                    Headers = @{ 'Content-Type' = 'image/test' }
                    RawContentLength = $uploadedBytes.Length
                    Content = $uploadedBytes
                }
            }

            {
                & $repository.ScriptPath -MigrateManifest -Confirm:$false
            }
                | Should -Throw -ExpectedMessage '*complete, non-empty image*'

            [System.Convert]::ToBase64String(
                [System.IO.File]::ReadAllBytes($repository.ManifestPath)
            )
                | Should -Be ([System.Convert]::ToBase64String($manifestBefore))
            $repository.JournalPath | Should -Exist
            $journal = Get-Content -LiteralPath $repository.JournalPath -Raw
                | ConvertFrom-Json -Depth 20
            $journal.schema_version | Should -Be 2
            @($journal.entries).Count | Should -Be 2
            $journal.entries[0].file | Should -Be $firstFile
            $journal.entries[0].collection_id | Should -Be 'collection-test-id'
            $journal.entries[0].created_at | Should -Be 1788048000
            $journal.entries[0].status | Should -Be 'verified'
            $journal.entries[1].file | Should -Be $secondFile
            $journal.entries[1].status | Should -Be 'uploaded'
            (Join-Path -Path $repository.PhotoDirectory -ChildPath 'a.webp')
                | Should -Exist
            (Join-Path -Path $repository.PhotoDirectory -ChildPath 'b.webp')
                | Should -Exist

            $result = & $repository.ScriptPath -MigrateManifest -PassThru -Confirm:$false
            $manifest = Get-Content -LiteralPath $repository.ManifestPath -Raw
                | ConvertFrom-Json -Depth 20

            @($result).Count | Should -Be 2
            @($result | Where-Object Status -EQ 'Resumed').Count | Should -Be 2
            $manifest.plants[0].photos[0].image_id
                | Should -Be (Get-TestImageId -Name 'a.webp')
            $manifest.plants[1].photos[0].image_id
                | Should -Be (Get-TestImageId -Name 'b.webp')
            $manifest.plants[0].photos[0].provider | Should -Be 'gyazo'
            $manifest.plants[0].photos[0].publication_name | Should -Be 'a.webp'
            $manifest.plants[0].photos[0].PSObject.Properties.Name
                | Should -Not -Contain 'file'
            $manifest.plants[0].photos[0].PSObject.Properties.Name
                | Should -Not -Contain 'source_file'
            $manifest.plants[0].photos[0].PSObject.Properties.Name
                | Should -Not -Contain 'gyazo'
            $repository.JournalPath | Should -Not -Exist
            (Join-Path -Path $repository.PhotoDirectory -ChildPath 'a.webp')
                | Should -Not -Exist
            (Join-Path -Path $repository.PhotoDirectory -ChildPath 'b.webp')
                | Should -Not -Exist
            Should -Invoke Invoke-RestMethod -Times 1 -Exactly -ParameterFilter {
                [string] $Method -eq 'Post' -and
                [System.IO.Path]::GetFileName(
                    $Form.imagedata.FullName
                ) -eq 'a.webp'
            }
            Should -Invoke Invoke-RestMethod -Times 1 -Exactly -ParameterFilter {
                [string] $Method -eq 'Post' -and
                [System.IO.Path]::GetFileName(
                    $Form.imagedata.FullName
                ) -eq 'b.webp'
            }
        }
    }
}
