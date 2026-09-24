BeforeAll {
    $script:ImporterPath = Join-Path $PSScriptRoot '../../scripts/fetch-plant-images.ps1'
    $script:ImporterText = Get-Content -LiteralPath $script:ImporterPath -Raw
    $script:ImporterAst = [System.Management.Automation.Language.Parser]::ParseInput(
        $script:ImporterText,
        [ref] $null,
        [ref] $null
    )
    foreach (
        $definition in $script:ImporterAst.FindAll(
            {
                param(
                    $node
                ) $node -is [System.Management.Automation.Language.FunctionDefinitionAst]
            },
            $false
        )
    ) {
        .([scriptblock]::Create($definition.Extent.Text))
    }
    $catalogAssignment = $script:ImporterAst.Find(
        {
            param(
                $node
            ) $node -is [System.Management.Automation.Language.AssignmentStatementAst] -and $node.Left.Extent.Text -eq '$plantCatalog'
        },
        $false
    )
    .([scriptblock]::Create($catalogAssignment.Extent.Text))
    $script:Catalog = $plantCatalog
}

Describe 'Reference photo catalog' {
    It 'covers every current plant profile exactly once' {
        $profileRoot = Join-Path $PSScriptRoot '../../docs/plants'
        $profiles = foreach (
            $group in 'starter',
            'cacti',
            'succulents',
            'rehab',
            'houseplants'
        ) {
            Get-ChildItem -LiteralPath (
                Join-Path $profileRoot $group
            ) -Filter '*.md'
                | Where-Object {
                    $_.BaseName -notin @( 'README', 'AGENTS', 'index' )
                }
                | Select-Object -ExpandProperty BaseName
        }
        @($script:Catalog.Slug | Sort-Object -Unique).Count
            | Should -Be $script:Catalog.Count
        @(
            Compare-Object -ReferenceObject @(
                $profiles | Sort-Object
            ) -DifferenceObject @($script:Catalog.Slug | Sort-Object)
        ).Count
            | Should -Be 0
    }

    It 'retains qualified scope for uncertain and cultivar references' {
        foreach (
            $slug in 'lithops-lesliei',
            'lithops-salicola',
            'pleiospilos-nelii',
            'faucaria-tuberculosa'
        ) {
            ($script:Catalog | Where-Object Slug -EQ $slug).ScopeNote
                | Should -Match 'probable'
        }
    }
}

Describe 'Reference image licensing' {
    It 'returns every individually licensed photo while preserving observation context' {
        Mock Invoke-JsonRequest {
            [pscustomobject] @{
                results =
                    @(
                        [pscustomobject] @{
                            id = 99
                            captive = $true
                            quality_grade = 'casual'
                            place_guess = 'Example garden'
                            observed_on = '2020-01-02'
                            photos =
                                @(
                                    [pscustomobject] @{
                                        id = 501
                                        license_code = 'cc-by'
                                        attribution = 'First author (CC BY 4.0)'
                                        url =
                                            'https://example.test/501/square.jpg'
                                    },
                                    [pscustomobject] @{
                                        id = 502
                                        license_code = 'cc-by-sa'
                                        attribution =
                                            'Second author (CC BY-SA 4.0)'
                                        url =
                                            'https://example.test/502/square.jpg'
                                    },
                                    [pscustomobject] @{
                                        id = 503
                                        license_code = 'cc-by-nc'
                                        attribution = 'Restricted author'
                                        url =
                                            'https://example.test/503/square.jpg'
                                    },
                                    [pscustomobject] @{
                                        id = 502
                                        license_code = 'cc-by-sa'
                                        attribution =
                                            'Second author (CC BY-SA 4.0)'
                                        url =
                                            'https://example.test/502/square.jpg'
                                    }
                                )
                        }
                    )
            }
        }
        foreach ( $slug in 'faucaria-tuberculosa', 'lithops-salicola' ) {
            $photos = @(
                Get-INaturalistCandidateList -Plant (
                    $script:Catalog | Where-Object Slug -EQ $slug
                )
            )
            $photos.Count | Should -Be 2
            $photos[0].PhotoId | Should -Be '501'
            $photos[1].PhotoId | Should -Be '502'
            $photos[0].SourceUrl | Should -Be $photos[1].SourceUrl
            $photos[0].License | Should -Be 'CC BY 4.0'
            $photos[1].License | Should -Be 'CC BY-SA 4.0'
            $photos[1].DownloadUrl
                | Should -Be 'https://example.test/502/large.jpg'
            $photos[1].Description | Should -Match 'Cultivated'
            $photos[1].ObservedOn | Should -Be '2020-01-02'
            $photos[1].Location | Should -Be 'Example garden'
        }
        Should -Invoke Invoke-JsonRequest -Times 2 -Exactly -ParameterFilter {
            -not $Query.ContainsKey(
                'quality_grade'
            ) -and -not $Query.ContainsKey('captive')
        }
        Get-INaturalistCandidateList -Plant (
            $script:Catalog | Where-Object Slug -EQ 'lithops-lesliei'
        )
            | Out-Null
        Should -Invoke Invoke-JsonRequest -Times 1 -Exactly -ParameterFilter {
            $Query.quality_grade -eq 'research' -and $Query.captive -eq 'false'
        }
    }

    It 'keeps share-alike and an explicit attribution version' {
        $name = Get-INaturalistLicenseName -Code 'cc-by-sa' -Attribution '(c) Example, some rights reserved (CC BY-SA 2.0)'
        $name | Should -Be 'CC BY-SA 2.0'
        Get-LicenseUrl -LicenseName $name -ProvidedUrl ''
            | Should -Be 'https://creativecommons.org/licenses/by-sa/2.0/'
        Get-INaturalistLicenseName -Code 'CC-BY-SA' -Attribution '(c) Example, CC BY-SA'
            | Should -Be 'CC BY-SA'
        Get-LicenseUrl -LicenseName 'CC BY-SA' -ProvidedUrl ''
            | Should -Be 'https://creativecommons.org/licenses/by-sa/4.0/'
    }

    It 'does not convert restrictive licenses into permissive licenses' {
        Get-LicenseUrl -LicenseName 'CC BY-NC 4.0' -ProvidedUrl ''
            | Should -Be ''
        {
            Get-INaturalistLicenseName -Code 'cc-by-nc' -Attribution ''
        }
            | Should -Throw '*Unsupported*'
    }

    It 'preserves a supplied source license URL and version' {
        Get-LicenseUrl -LicenseName 'CC BY-SA 3.0' -ProvidedUrl 'http://creativecommons.org/licenses/by-sa/3.0/'
            | Should -Be 'https://creativecommons.org/licenses/by-sa/3.0/'
    }

    It 'rejects Commons photos without a nonempty normalized creator credit' {
        Mock Invoke-JsonRequest {
            [pscustomobject] @{
                query =
                    [pscustomobject] @{
                        pages =
                            @(
                                foreach ($number in 1..4) {
                                    $metadata = [pscustomobject] @{
                                        LicenseShortName =
                                            [pscustomobject] @{
                                                value = 'CC BY-SA 3.0'
                                            }
                                    }
                                    if ($number -ne 1) {
                                        $artist = switch ($number) {
                                            2 {
                                                ''
                                            }
                                            3 {
                                                '<span> &nbsp; </span>'
                                            }
                                            4 {
                                                '<span>Documented creator</span>'
                                            }
                                        }
                                        $metadata
                                            | Add-Member -NotePropertyName Artist -NotePropertyValue (
                                                [pscustomobject] @{
                                                    value = $artist
                                                }
                                            )
                                    }
                                    [pscustomobject] @{
                                        pageid = $number
                                        title = "File:Plant $number.jpg"
                                        imageinfo =
                                            @(
                                                [pscustomobject] @{
                                                    mime = 'image/jpeg'
                                                    url =
                                                        'https://example.test/original.jpg'
                                                    thumburl =
                                                        'https://example.test/thumb.jpg'
                                                    descriptionurl =
                                                        "https://example.test/source-$number"
                                                    extmetadata = $metadata
                                                }
                                            )
                                    }
                                }
                            )
                    }
            }
        }
        $photos = @(Get-WikimediaCandidateList -Plant $script:Catalog[0])
        $photos.Count | Should -Be 1
        $photos[0].Author | Should -Be 'Documented creator'
        $photos[0].PageId | Should -Be '4'
    }

    It 'excludes noncommercial Commons candidates while accepting share-alike' {
        Mock Invoke-JsonRequest {
            [pscustomobject] @{
                query =
                    [pscustomobject] @{
                        pages =
                            @(
                                foreach (
                                    $license in 'CC BY-NC 4.0',
                                    'CC BY-SA 3.0'
                                ) {
                                    [pscustomobject] @{
                                        pageid = $license
                                        title = "File:$license.jpg"
                                        imageinfo =
                                            @(
                                                [pscustomobject] @{
                                                    mime = 'image/jpeg'
                                                    url =
                                                        'https://example.test/original.jpg'
                                                    thumburl =
                                                        'https://example.test/thumb.jpg'
                                                    descriptionurl =
                                                        "https://example.test/$license"
                                                    extmetadata =
                                                        [pscustomobject] @{
                                                            LicenseShortName =
                                                                [pscustomobject] @{
                                                                    value =
                                                                        $license
                                                                }
                                                            Artist =
                                                                [pscustomobject] @{
                                                                    value =
                                                                        'Example creator'
                                                                }
                                                        }
                                                }
                                            )
                                    }
                                }
                            )
                    }
            }
        }
        $photos = @(Get-WikimediaCandidateList -Plant $script:Catalog[0])
        $photos.Count | Should -Be 1
        $photos[0].License | Should -Be 'CC BY-SA 3.0'
    }
}

Describe 'Scoped archive refresh' {
    BeforeEach {
        $script:FixtureRoot = Join-Path $TestDrive(
            "repository with spaces {0}" -f [guid]::NewGuid().ToString('N')
        )
        $script:FixtureScripts = Join-Path $script:FixtureRoot 'scripts'
        $script:FixtureAssets = Join-Path $script:FixtureRoot 'assets/plants'
        New-Item -ItemType Directory -Path $script:FixtureScripts, $script:FixtureAssets -Force
            | Out-Null
        $script:FixtureImporter = Join-Path $script:FixtureScripts 'fetch-plant-images.ps1'
        Copy-Item -LiteralPath $script:ImporterPath -Destination $script:FixtureImporter
        $script:FixtureManifest = Join-Path $script:FixtureAssets 'photo-manifest.json'
        Mock Invoke-RestMethod {
            throw 'Unexpected network request in archive-preservation test'
        }
        Mock Start-Sleep {}
    }

    It 'preserves unknown records and archived plans while reusing balanced component references' {
        $fixtureRecords = @(
            foreach (
                $slug in 'lithops-lesliei',
                'lithops-salicola',
                'pachira-glabra',
                'unlisted-preserved'
            ) {
                $directory = Join-Path $script:FixtureAssets $slug
                New-Item -ItemType Directory -Path $directory -Force | Out-Null
                foreach ($number in 1..10) {
                    $file = "assets/plants/$slug/$number.jpg"
                    Set-Content -LiteralPath (
                        Join-Path $script:FixtureRoot $file
                    ) -Value 'fixture bytes'
                    [pscustomobject] @{
                        plant_id = 'Fixture'
                        plant_slug = $slug
                        scientific_name = $slug
                        common_name = $slug
                        scope_note = 'Fixture scope'
                        file = $file
                        source = 'iNaturalist'
                        source_url = "https://example.test/$slug/$number"
                        subject = 'habit'
                        title = "$slug photograph"
                        description = 'Fixture description'
                        author = 'Example (CC BY-SA 2.0)'
                        license = 'CC BY SA'
                        license_url =
                            'https://creativecommons.org/licenses/by/4.0/'
                        sha256 = 'fixture'
                        observed_on = ''
                        location = ''
                    }
                }
            }
        )
        @{
            schema_version = 1
            generated_at = '2026-09-01T00:00:00Z'
            photos = $fixtureRecords
        }
            | ConvertTo-Json -Depth 8
            | Set-Content -LiteralPath $script:FixtureManifest
        $archivedSection = "## Archived plans`n`nPreserve [abandoned research](./abandoned/) exactly — café."
        Set-Content -LiteralPath (
            Join-Path $script:FixtureAssets 'README.md'
        ) -Value "# Archive`n`n$archivedSection"

        & $script:FixtureImporter -PlantSlug 'lithops-lesliei', 'lithops-salicola', 'lithops-shared-planter' -ImagesPerPlant 10 -Confirm:$false

        $result = Get-Content -LiteralPath $script:FixtureManifest -Raw
            | ConvertFrom-Json
        @(
            $result.photos | Where-Object plant_slug -EQ 'unlisted-preserved'
        ).Count
            | Should -Be 10
        (
            $result.photos | Where-Object plant_slug -EQ 'unlisted-preserved' | ConvertTo-Json -Depth 8
        )
            | Should -Be (
                $fixtureRecords | Where-Object plant_slug -EQ 'unlisted-preserved' | Sort-Object plant_id,
                source,
                file | ConvertTo-Json -Depth 8
            )
        $overview = @(
            $result.photos | Where-Object plant_slug -EQ 'lithops-shared-planter'
        )
        $overview.Count | Should -Be 10
        @($overview | Where-Object scientific_name -EQ 'Lithops lesliei').Count
            | Should -Be 5
        @($overview | Where-Object scientific_name -EQ 'Lithops salicola').Count
            | Should -Be 5
        $overview[0].license | Should -Be 'CC BY-SA 2.0'
        $overview[0].license_url
            | Should -Be 'https://creativecommons.org/licenses/by-sa/2.0/'
        $overview[0].scope_note | Should -Match 'probable'
        $overview[0].sha256 | Should -Be 'fixture'
        Get-Content -LiteralPath (
            Join-Path $script:FixtureAssets 'lithops-shared-planter/README.md'
        ) -Raw
            | Should -Match '\./\.\./lithops-lesliei/'
        Get-Content -LiteralPath (
            Join-Path $script:FixtureAssets 'README.md'
        ) -Raw
            | Should -Match ([regex]::Escape($archivedSection))
        foreach (
            $relativePath in 'photo-manifest.json',
            'README.md',
            'ATTRIBUTION.md',
            'lithops-lesliei/README.md',
            'lithops-shared-planter/README.md'
        ) {
            $generatedPath = Join-Path $script:FixtureAssets $relativePath
            $generatedText = [IO.File]::ReadAllText($generatedPath)
            $generatedText | Should -Not -Match "`r"
            $generatedText.EndsWith("`n") | Should -BeTrue
            $bytes = [IO.File]::ReadAllBytes($generatedPath)
            [Convert]::ToHexString($bytes[0..2]) | Should -Not -Be 'EFBBBF'
        }
        $firstManifest = Get-Content -LiteralPath $script:FixtureManifest -Raw
        & $script:FixtureImporter -PlantSlug 'lithops-lesliei', 'lithops-salicola', 'lithops-shared-planter' -ImagesPerPlant 10 -Confirm:$false
        Get-Content -LiteralPath $script:FixtureManifest -Raw
            | Should -Be $firstManifest
        & $script:FixtureImporter -PlantSlug 'pachira-glabra' -ImagesPerPlant 10 -Confirm:$false
        Get-Content -LiteralPath $script:FixtureManifest -Raw
            | Should -Be $firstManifest
        Should -Invoke Invoke-RestMethod -Times 0
    }

    It 'validates unknown slugs before creating archive files' {
        {
            & $script:FixtureImporter -PlantSlug '../outside' -Confirm:$false
        }
            | Should -Throw '*Unknown plant slug*'
        Test-Path -LiteralPath $script:FixtureManifest | Should -BeFalse
    }

    It 'reuses a matching source file without changing its credits or downloading a second copy' {
        $originalPath = Join-Path $script:FixtureAssets 'existing.jpg'
        Set-Content -LiteralPath $originalPath -Value 'reference photograph fixture'
        $original = [pscustomobject] @{
            plant_id = 'Old'
            plant_slug = 'old'
            scientific_name = 'Related species'
            common_name = 'Old name'
            scope_note = 'Old scope'
            file = 'assets/plants/existing.jpg'
            source_url = 'https://example.test/shared'
            title = 'Original title'
            author = 'Original author'
            license = 'CC BY-SA 3.0'
            license_url = 'https://creativecommons.org/licenses/by-sa/3.0/'
            sha256 =
                (
                    Get-FileHash -LiteralPath $originalPath -Algorithm SHA256
                ).Hash.ToLowerInvariant()
        }
        $records = [System.Collections.Generic.List[object]]::new()
        $records.Add($original)
        $plant = $script:Catalog | Where-Object Slug -EQ 'pleiospilos-nelii'
        $photo = [pscustomobject] @{ SourceUrl = $original.source_url }
        $copy = Get-ReusedPhotoRecord -Plant $plant -Photo $photo -Records $records -Root $script:FixtureRoot
        $copy.plant_slug | Should -Be 'pleiospilos-nelii'
        $copy.scope_note | Should -Match 'probable'
        foreach (
            $property in 'file',
            'sha256',
            'title',
            'author',
            'license',
            'license_url',
            'source_url'
        ) {
            $copy.$property | Should -Be $original.$property
        }
        $original.plant_slug | Should -Be 'old'
        Should -Invoke Invoke-RestMethod -Times 0
    }

    It 'rejects missing, altered, and out-of-archive reused reference files' {
        $records = [System.Collections.Generic.List[object]]::new()
        $original = [pscustomobject] @{
            file = 'assets/plants/missing.jpg'
            source_url = 'https://example.test/shared'
            sha256 = 'wrong hash'
        }
        $records.Add($original)
        $photo = [pscustomobject] @{ SourceUrl = $original.source_url }
        {
            Get-ReusedPhotoRecord -Plant $script:Catalog[
                0
            ] -Photo $photo -Records $records -Root $script:FixtureRoot
        }
            | Should -Throw '*missing*'
        Set-Content -LiteralPath (
            Join-Path $script:FixtureAssets 'missing.jpg'
        ) -Value 'changed image'
        {
            Get-ReusedPhotoRecord -Plant $script:Catalog[
                0
            ] -Photo $photo -Records $records -Root $script:FixtureRoot
        }
            | Should -Throw '*hash differs*'
        $original.file = '../outside.jpg'
        {
            Get-ReusedPhotoRecord -Plant $script:Catalog[
                0
            ] -Photo $photo -Records $records -Root $script:FixtureRoot
        }
            | Should -Throw '*outside*'
    }

    It 'allows a related plant gallery to select already archived sources without duplicating image files' {
        $sourceRecords = foreach ($number in 1..2) {
            $file = "assets/plants/reference-$number.jpg"
            $path = Join-Path $script:FixtureRoot $file
            Set-Content -LiteralPath $path -Value "distinct reference $number"
            [pscustomobject] @{
                plant_id = 'Succulent-06'
                plant_slug = 'pleiospilos-nelii-royal-flush'
                scientific_name = 'Pleiospilos nelii'
                common_name = 'Royal Flush split rock'
                scope_note = 'Species context'
                file = $file
                subject = 'habit'
                title = "Species image $number"
                source = 'Wikimedia Commons'
                source_url = "https://example.test/source-$number"
                author = 'Example'
                license = 'CC BY-SA 3.0'
                license_url = 'https://creativecommons.org/licenses/by-sa/3.0/'
                sha256 =
                    (
                        Get-FileHash -LiteralPath $path -Algorithm SHA256
                    ).Hash.ToLowerInvariant()
            }
        }
        @{
            schema_version = 1
            generated_at = '2026-09-01T00:00:00Z'
            photos = @($sourceRecords)
        }
            | ConvertTo-Json -Depth 8
            | Set-Content -LiteralPath $script:FixtureManifest
        Mock Invoke-RestMethod {
            param($Uri)

            if ($Uri -ne 'https://commons.wikimedia.org/w/api.php') {
                throw 'Unexpected fallback or download request'
            }
            [pscustomobject] @{
                query =
                    [pscustomobject] @{
                        pages =
                            @(
                                foreach ($number in 1..2) {
                                    [pscustomobject] @{
                                        pageid = $number
                                        title = "File:Species image $number.jpg"
                                        imageinfo =
                                            @(
                                                [pscustomobject] @{
                                                    mime = 'image/jpeg'
                                                    url =
                                                        'https://example.test/original.jpg'
                                                    thumburl =
                                                        'https://example.test/thumb.jpg'
                                                    descriptionurl =
                                                        "https://example.test/source-$number"
                                                    extmetadata =
                                                        [pscustomobject] @{
                                                            LicenseShortName =
                                                                [pscustomobject] @{
                                                                    value =
                                                                        'CC BY-SA 3.0'
                                                                }
                                                            Artist =
                                                                [pscustomobject] @{
                                                                    value =
                                                                        'Example creator'
                                                                }
                                                        }
                                                }
                                            )
                                    }
                                }
                            )
                    }
            }
        }
        Mock Invoke-WebRequest {
            throw 'No image download is needed for an archived source'
        }
        & $script:FixtureImporter -PlantSlug 'pleiospilos-nelii' -ImagesPerPlant 2 -Confirm:$false
        $result = Get-Content -LiteralPath $script:FixtureManifest -Raw
            | ConvertFrom-Json
        $target = @(
            $result.photos | Where-Object plant_slug -EQ 'pleiospilos-nelii'
        )
        $target.Count | Should -Be 2
        @($target.file | Sort-Object -Unique).Count | Should -Be 2
        @(
            $target | Where-Object {
                $_.file -notin $sourceRecords.file
            }
        ).Count
            | Should -Be 0
        @(
            Get-ChildItem -LiteralPath (
                Join-Path $script:FixtureAssets 'pleiospilos-nelii'
            ) -Filter '*.jpg'
        ).Count
            | Should -Be 0
        Should -Invoke Invoke-WebRequest -Times 0
    }

    It 'supports a fifteen-image target with WhatIf and performs no writes or requests' {
        & $script:FixtureImporter -PlantSlug 'lithops-lesliei' -ImagesPerPlant 15 -WhatIf
        Test-Path -LiteralPath $script:FixtureManifest | Should -BeFalse
        Should -Invoke Invoke-RestMethod -Times 0
    }

    It 'imports and reuses separate photos from the same observation without changing existing observation metadata' {
        $sourceRecords = foreach ($photoId in 501..502) {
            $file = "assets/plants/inaturalist-99-$photoId-habitat.jpg"
            $path = Join-Path $script:FixtureRoot $file
            Set-Content -LiteralPath $path -Value "individual photo $photoId"
            [pscustomobject] @{
                plant_id = 'Succulent-15B'
                plant_slug =
                    $(
                        if ($photoId -eq 501) {
                            'lithops-salicola'
                        } else {
                            'other-reference'
                        }
                    )
                scientific_name = 'Lithops salicola'
                common_name = 'Lithops salicola'
                scope_note = 'Original scope'
                file = $file
                subject = 'habit'
                title = "Original photo $photoId"
                description = 'Original observation description'
                source = 'iNaturalist'
                source_url = 'https://www.inaturalist.org/observations/99'
                author = "Original author $photoId"
                license = 'CC BY-SA'
                license_url = 'https://creativecommons.org/licenses/by-sa/4.0/'
                observed_on = '2020-01-02'
                location = 'Original location'
                sha256 =
                    (
                        Get-FileHash -LiteralPath $path -Algorithm SHA256
                    ).Hash.ToLowerInvariant()
            }
        }
        @{
            schema_version = 1
            generated_at = '2026-09-01T00:00:00Z'
            photos = @($sourceRecords)
        }
            | ConvertTo-Json -Depth 8
            | Set-Content -LiteralPath $script:FixtureManifest
        Mock Invoke-RestMethod {
            param($Uri)

            if ($Uri -eq 'https://commons.wikimedia.org/w/api.php') {
                return [pscustomobject] @{
                    query = [pscustomobject] @{ pages = @() }
                }
            }
            if ($Uri -ne 'https://api.inaturalist.org/v1/observations') {
                throw 'Unexpected download request'
            }
            [pscustomobject] @{
                results =
                    @(
                        [pscustomobject] @{
                            id = 99
                            captive = $true
                            quality_grade = 'casual'
                            place_guess = 'Current location'
                            observed_on = '2020-01-02'
                            photos =
                                @(
                                    foreach ($photoId in 501..502) {
                                        [pscustomobject] @{
                                            id = $photoId
                                            license_code = 'cc-by-sa'
                                            attribution = 'Current attribution'
                                            url =
                                                "https://example.test/$photoId/square.jpg"
                                        }
                                    }
                                )
                        }
                    )
            }
        }
        Mock Invoke-WebRequest {
            throw 'Existing individual photo files should be reused'
        }
        & $script:FixtureImporter -PlantSlug 'lithops-salicola' -ImagesPerPlant 2 -Confirm:$false
        $result = Get-Content -LiteralPath $script:FixtureManifest -Raw
            | ConvertFrom-Json
        $target = @(
            $result.photos | Where-Object plant_slug -EQ 'lithops-salicola'
        )
        $target.Count | Should -Be 2
        @($target.source_url | Sort-Object -Unique).Count | Should -Be 1
        @($target.file | Sort-Object -Unique).Count | Should -Be 2
        foreach ($record in $target) {
            $original = $sourceRecords | Where-Object file -EQ $record.file
            foreach (
                $property in 'description',
                'title',
                'author',
                'observed_on',
                'location',
                'license',
                'license_url',
                'sha256'
            ) {
                $record.$property | Should -Be $original.$property
            }
        }
        $firstManifest = Get-Content -LiteralPath $script:FixtureManifest -Raw
        & $script:FixtureImporter -PlantSlug 'lithops-salicola' -ImagesPerPlant 2 -Confirm:$false
        Get-Content -LiteralPath $script:FixtureManifest -Raw
            | Should -Be $firstManifest
        Should -Invoke Invoke-WebRequest -Times 0
    }
}
