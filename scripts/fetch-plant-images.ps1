[CmdletBinding()]
param(
    [ValidateRange(2, 10)]
    [int] $ImagesPerPlant = 10,

    [string[]] $PlantSlug
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$plantCatalog = @(
    [pscustomobject]@{
        Id = 'Starter-01'
        LabelId = 'B2'
        Slug = 'oreocereus-trollii'
        ScientificName = 'Oreocereus trollii'
        CommonName = 'Old Man of the Andes'
        CommonsCategory = 'Oreocereus trollii'
        CommonsSearch = 'Oreocereus trollii'
        INaturalistName = 'Oreocereus trollii'
        ScopeNote = 'Species-reference photographs.'
    },
    [pscustomobject]@{
        Id = 'Starter-02'
        LabelId = 'B1'
        Slug = 'stenocactus-phyllacanthus'
        ScientificName = 'Stenocactus phyllacanthus'
        CommonName = 'Grass-blade cactus'
        CommonsCategory = 'Stenocactus phyllacanthus'
        CommonsSearch = 'Stenocactus phyllacanthus'
        INaturalistName = 'Stenocactus phyllacanthus'
        ScopeNote = 'Species-reference photographs.'
    },
    [pscustomobject]@{
        Id = 'Starter-03'
        LabelId = 'C2'
        Slug = 'echinocereus-rigidissimus-rubispinus'
        ScientificName = 'Echinocereus rigidissimus subsp. rubispinus'
        CommonName = 'Rainbow hedgehog cactus'
        CommonsCategory = 'Echinocereus rigidissimus subsp. rubispinus'
        CommonsSearch = 'Echinocereus rigidissimus rubispinus'
        INaturalistName = 'Echinocereus rigidissimus rubispinus'
        ScopeNote = 'Subspecies-reference photographs.'
    },
    [pscustomobject]@{
        Id = 'Starter-04'
        LabelId = 'A3'
        Slug = 'nyctocereus-serpentinus'
        ScientificName = 'Nyctocereus serpentinus'
        CommonName = 'Serpent cactus'
        CommonsCategory = 'Nyctocereus serpentinus'
        CommonsSearch = 'Nyctocereus serpentinus Peniocereus'
        INaturalistName = 'Nyctocereus serpentinus'
        ScopeNote = 'Species-reference photographs; some sources use Peniocereus serpentinus.'
    },
    [pscustomobject]@{
        Id = 'Starter-05'
        LabelId = 'A2'
        Slug = 'mammillaria-plumosa'
        ScientificName = 'Mammillaria plumosa'
        CommonName = 'Feather cactus'
        CommonsCategory = 'Mammillaria plumosa'
        CommonsSearch = 'Mammillaria plumosa'
        INaturalistName = 'Mammillaria plumosa'
        ScopeNote = 'Species-reference photographs.'
    },
    [pscustomobject]@{
        Id = 'Starter-06'
        LabelId = 'D2'
        Slug = 'echinopsis-subdenudata'
        ScientificName = 'Echinopsis subdenudata'
        CommonName = 'Domino cactus'
        CommonsCategory = 'Echinopsis subdenudata'
        CommonsSearch = 'Echinopsis subdenudata Domino cactus'
        INaturalistName = 'Echinopsis ancistrophora'
        ScopeNote = 'Species-reference photographs; current Kew taxonomy treats this name as a synonym of Echinopsis ancistrophora.'
    },
    [pscustomobject]@{
        Id = 'Starter-07'
        LabelId = 'A1'
        Slug = 'gymnocalycium-mihanovichii-variegated'
        ScientificName = 'Gymnocalycium mihanovichii'
        CommonName = 'Variegated moon cactus'
        # Deliberately avoid the broad species category here: its first results
        # are dominated by chlorophyll-free grafted scions, unlike this plant.
        CommonsCategory = 'Gymnocalycium mihanovichii'
        CommonsSearch = 'Gymnocalycium mihanovichii variegata'
        INaturalistName = 'Gymnocalycium mihanovichii'
        ScopeNote = 'Own-root variegated examples are prioritized; normal wild forms remain as species context. Grafted chlorophyll-free scions are excluded.'
    },
    [pscustomobject]@{
        Id = 'Starter-08'
        LabelId = 'C1'
        Slug = 'gymnocalycium-saglionis'
        ScientificName = 'Gymnocalycium saglionis'
        CommonName = 'Giant chin cactus'
        CommonsCategory = 'Gymnocalycium saglionis'
        CommonsSearch = 'Gymnocalycium saglionis'
        INaturalistName = 'Gymnocalycium saglionis'
        ScopeNote = 'Species-reference photographs.'
    },
    [pscustomobject]@{
        Id = 'Starter-09'
        LabelId = 'B3'
        Slug = 'myrtillocactus-geometrizans-indigo-wave'
        ScientificName = 'Myrtillocactus geometrizans'
        CommonName = 'Indigo Wave'
        CommonsCategory = 'Myrtillocactus geometrizans'
        CommonsSearch = 'Myrtillocactus geometrizans monstrose Indigo Wave'
        INaturalistName = 'Myrtillocactus geometrizans'
        ScopeNote = 'Most photographs show the normal species; the collection plant is the monstrose trade selection sold as Indigo Wave.'
    },
    [pscustomobject]@{
        Id = 'Starter-10'
        LabelId = 'D3'
        Slug = 'cereus-forbesii-ming-thing'
        ScientificName = 'Cereus forbesii'
        CommonName = 'Ming Thing'
        CommonsCategory = 'Cereus forbesii'
        CommonsSearch = 'Cereus forbesii Ming Thing monstrose'
        INaturalistName = 'Cereus forbesii'
        ScopeNote = 'The archive mixes normal species references with any reusable Ming Thing images found; the collection plant is the monstrose cultivar.'
    },
    [pscustomobject]@{
        Id = 'Starter-11'
        LabelId = 'D1'
        Slug = 'euphorbia-obesa-hybrid'
        ScientificName = 'Euphorbia obesa'
        CommonName = 'Dragon''s Egg'
        CommonsCategory = 'Euphorbia obesa'
        CommonsSearch = 'Euphorbia obesa'
        INaturalistName = 'Euphorbia obesa'
        ScopeNote = 'Species-reference photographs; the collection plant is probably an E. obesa-type hybrid or selection rather than a documented wild form.'
    },
    [pscustomobject]@{
        Id = 'Starter-12'
        LabelId = 'C3'
        Slug = 'astrophytum-ornatum'
        ScientificName = 'Astrophytum ornatum'
        CommonName = 'Monk''s hood cactus'
        CommonsCategory = 'Astrophytum ornatum'
        CommonsSearch = 'Astrophytum ornatum'
        INaturalistName = 'Astrophytum ornatum'
        ScopeNote = 'Species-reference photographs.'
    },
    [pscustomobject]@{
        Id = 'Cactus-01'
        LabelId = 'E1'
        Slug = 'espostoa-melanostele-nana'
        ScientificName = 'Espostoa melanostele subsp. nana'
        CommonName = 'Dwarf old man cactus'
        CommonsCategory = 'Espostoa melanostele'
        CommonsSearch = 'Espostoa melanostele nana'
        INaturalistName = 'Espostoa melanostele'
        ScopeNote = 'Species-reference photographs; the collection ID is probable and E. lanata remains the main alternative.'
    },
    [pscustomobject]@{
        Id = 'Cactus-02'
        LabelId = 'E2'
        Slug = 'chamaelobivia-hybrid'
        ScientificName = 'Echinopsis hybrid, Chamaelobivia Group'
        CommonName = 'Chamaelobivia / peanut cactus hybrid'
        # Commons retains this broad photo category under the older name.
        CommonsCategory = 'Chamaecereus silvestrii'
        CommonsSearch = 'Echinopsis chamaecereus'
        INaturalistName = 'Echinopsis chamaecereus'
        ScopeNote = 'Peanut-cactus ancestry reference photographs; the collection plant is a horticultural hybrid with no known wild range or cultivar name.'
    },
    [pscustomobject]@{
        Id = 'Cactus-03'
        LabelId = 'E3'
        Slug = 'mammillaria-mammillaris'
        ScientificName = 'Mammillaria mammillaris'
        CommonName = 'Woolly nipple cactus'
        CommonsCategory = 'Mammillaria mammillaris'
        CommonsSearch = 'Mammillaria mammillaris'
        INaturalistName = 'Mammillaria mammillaris'
        ScopeNote = 'Species-reference photographs; the collection ID is probable and replaces the former M. cf. melanocentra record after review of close photographs.'
    },
    [pscustomobject]@{
        Id = 'Cactus-04'
        LabelId = 'F3'
        Slug = 'parodia-leninghausii'
        ScientificName = 'Parodia leninghausii'
        CommonName = 'Yellow tower cactus'
        CommonsCategory = 'Parodia leninghausii'
        CommonsSearch = 'Parodia leninghausii Notocactus'
        INaturalistName = 'Parodia leninghausii'
        ScopeNote = 'Species-reference photographs.'
    },
    [pscustomobject]@{
        Id = 'Cactus-05'
        LabelId = 'F2'
        Slug = 'myrtillocactus-geometrizans-fukurokuryuzinboku'
        ScientificName = 'Myrtillocactus geometrizans Fukurokuryuzinboku'
        CommonName = 'Boobie cactus'
        CommonsCategory = 'Myrtillocactus geometrizans'
        CommonsSearch = 'Myrtillocactus geometrizans Fukurokuryuzinboku'
        INaturalistName = 'Myrtillocactus geometrizans'
        ScopeNote = 'Species-reference photographs may show the normal species; the collection plant is the monstrose cultivar Fukurokuryuzinboku.'
    },
    [pscustomobject]@{
        Id = 'Cactus-06'
        LabelId = 'F1'
        Slug = 'mammillaria-rekoi'
        ScientificName = 'Mammillaria rekoi'
        CommonName = 'Hook-spined pincushion cactus'
        CommonsCategory = 'Mammillaria rekoi'
        CommonsSearch = 'Mammillaria rekoi'
        INaturalistName = 'Mammillaria rekoi'
        ScopeNote = 'Species-reference photographs; the collection ID remains probable, with the M. crinita complex or a horticultural hybrid as alternatives.'
    },
    [pscustomobject]@{
        Id = 'Cactus-07'
        LabelId = 'G1'
        Slug = 'austrocylindropuntia-subulata'
        ScientificName = 'Austrocylindropuntia subulata'
        CommonName = 'Eve''s needle cactus'
        CommonsCategory = 'Austrocylindropuntia subulata'
        CommonsSearch = 'Austrocylindropuntia subulata Eve needle'
        INaturalistName = 'Austrocylindropuntia subulata'
        ScopeNote = 'Species-reference photographs. The ordered plant has not yet arrived, so these images do not document its condition or form.'
    },
    [pscustomobject]@{
        Id = 'Cactus-08'
        LabelId = 'G2'
        Slug = 'tephrocactus-articulatus-papyracanthus'
        ScientificName = 'Tephrocactus articulatus var. papyracanthus'
        CommonName = 'Paper spine cactus'
        CommonsCategory = 'Tephrocactus articulatus'
        CommonsSearch = 'Tephrocactus articulatus papyracanthus paper spine'
        INaturalistName = 'Tephrocactus articulatus'
        ScopeNote = 'Species-reference photographs may show other T. articulatus forms; the ordered plant is the papery-spined horticultural variety.'
    },
    [pscustomobject]@{
        Id = 'Cactus-09'
        LabelId = 'G3'
        Slug = 'gymnocalycium-mihanovichii-black-widow'
        ScientificName = 'Gymnocalycium mihanovichii'
        CommonName = 'Black Widow chin cactus'
        CommonsCategory = 'Gymnocalycium mihanovichii'
        CommonsSearch = 'Gymnocalycium mihanovichii variegata black purple'
        INaturalistName = 'Gymnocalycium mihanovichii'
        INaturalistResearchOnly = $false
        INaturalistWildOnly = $false
        ScopeNote = 'Variegated and normal species references, including cultivated observations; no reusable image is assumed to show the exact Black Widow cultivar.'
    },
    [pscustomobject]@{
        Id = 'Succulent-01'
        LabelId = '#2; formerly C4-D4'
        Slug = 'echeveria-pulidonis'
        ScientificName = 'Echeveria pulidonis'
        CommonName = 'Pulido''s echeveria'
        CommonsCategory = 'Echeveria pulidonis'
        CommonsSearch = 'Echeveria pulidonis'
        INaturalistName = 'Echeveria pulidonis'
        ScopeNote = 'Species-reference photographs; the collection ID remains provisional because close hybrids are common.'
    },
    [pscustomobject]@{
        Id = 'Succulent-02'
        LabelId = '#2; formerly C4-D4'
        Slug = 'portulacaria-afra'
        ScientificName = 'Portulacaria afra'
        CommonName = 'Elephant bush'
        CommonsCategory = 'Portulacaria afra'
        CommonsSearch = 'Portulacaria afra spekboom'
        INaturalistName = 'Portulacaria afra'
        ScopeNote = 'Species-reference photographs; the yellow-green collection plant may be a golden cultivar.'
    },
    [pscustomobject]@{
        Id = 'Succulent-03'
        LabelId = '#2; formerly C4-D4'
        Slug = 'kalanchoe-bracteata'
        ScientificName = 'Kalanchoe bracteata'
        CommonName = 'Silver teaspoons'
        CommonsCategory = 'Kalanchoe bracteata'
        CommonsSearch = 'Kalanchoe bracteata silver teaspoons'
        INaturalistName = 'Kalanchoe bracteata'
        ScopeNote = 'Species-reference photographs; the collection ID remains provisional pending flowers.'
    },
    [pscustomobject]@{
        Id = 'Succulent-04'
        LabelId = '#2; formerly C4-D4'
        Slug = 'kalanchoe-orgyalis'
        ScientificName = 'Kalanchoe orgyalis'
        CommonName = 'Copper spoons'
        CommonsCategory = 'Kalanchoe orgyalis'
        CommonsSearch = 'Kalanchoe orgyalis copper spoons'
        INaturalistName = 'Kalanchoe orgyalis'
        ScopeNote = 'Species-reference photographs.'
    },
    [pscustomobject]@{
        Id = 'Succulent-05'
        LabelId = '#4'
        Slug = 'aeonium-haworthii-dream-color'
        ScientificName = 'Aeonium haworthii Dream Color'
        CommonName = 'Kiwi aeonium'
        CommonsCategory = 'Aeonium haworthii'
        CommonsSearch = 'Aeonium haworthii Kiwi Dream Color'
        INaturalistName = 'Aeonium haworthii'
        ScopeNote = 'Species-reference photographs may show the underlying species; the collection plant is the variegated cultivar Dream Color.'
    },
    [pscustomobject]@{
        Id = 'Succulent-06'
        LabelId = 'H1'
        Slug = 'pleiospilos-nelii-royal-flush'
        ScientificName = 'Pleiospilos nelii'
        CommonName = 'Royal Flush split rock'
        CommonsCategory = 'Pleiospilos nelii'
        CommonsSearch = 'Pleiospilos nelii Royal Flush purple'
        INaturalistName = 'Pleiospilos nelii'
        INaturalistResearchOnly = $false
        INaturalistWildOnly = $false
        ScopeNote = 'Species references, including cultivated observations, may show the normal green-gray form; the ordered plant is the purple Royal Flush cultivar.'
    },
    [pscustomobject]@{
        Id = 'Succulent-07'
        LabelId = 'H2'
        Slug = 'echeveria-raindrops'
        ScientificName = 'Echeveria Raindrops'
        CommonName = 'Raindrops echeveria'
        CommonsCategory = 'Echeveria'
        CommonsSearch = 'Echeveria Raindrops cultivar'
        INaturalistName = 'Echeveria'
        ScopeNote = 'Cultivar search results are prioritized; broad Echeveria images are genus context and may not show the Raindrops leaf bumps.'
    },
    [pscustomobject]@{
        Id = 'Succulent-08'
        LabelId = 'H3'
        Slug = 'sempervivum-coconut-crystal'
        ScientificName = 'Sempervivum Coconut Crystal'
        CommonName = 'Coconut Crystal hens and chicks'
        CommonsCategory = 'Sempervivum'
        CommonsSearch = 'Sempervivum Coconut Crystal Colorockz'
        INaturalistName = 'Sempervivum'
        ScopeNote = 'Genus-reference photographs; no reusable image is assumed to show the exact Colorockz Coconut Crystal cultivar.'
    },
    [pscustomobject]@{
        Id = 'Rehab-01'
        LabelId = '#1; formerly A4-B4'
        Slug = 'pilosocereus-pachycladus-variegated'
        ScientificName = 'Pilosocereus pachycladus'
        CommonName = 'Blue torch cactus'
        CommonsCategory = 'Pilosocereus pachycladus'
        CommonsSearch = 'Pilosocereus pachycladus blue torch'
        INaturalistName = 'Pilosocereus pachycladus'
        ScopeNote = 'Most photographs show normal wild plants; the collection plant appears variegated and its ID remains provisional.'
    },
    [pscustomobject]@{
        Id = 'Rehab-02'
        LabelId = '#1; formerly A4-B4'
        Slug = 'cleistocactus-colademononis'
        ScientificName = 'Cleistocactus colademononis'
        CommonName = 'Monkey tail cactus'
        CommonsCategory = 'Cleistocactus colademononis'
        CommonsSearch = 'Cleistocactus colademononis monkey tail flower'
        INaturalistName = 'Cleistocactus colademononis'
        ScopeNote = 'Species-reference photographs.'
    },
    [pscustomobject]@{
        Id = 'Rehab-03'
        LabelId = '#1; formerly A4-B4'
        Slug = 'echinopsis-spachiana'
        ScientificName = 'Echinopsis spachiana'
        CommonName = 'Golden torch cactus'
        CommonsCategory = 'Echinopsis spachiana'
        CommonsSearch = 'Echinopsis spachiana Trichocereus golden torch'
        INaturalistName = 'Echinopsis spachiana'
        ScopeNote = 'Species-reference photographs; the collection ID remains provisional.'
    },
    [pscustomobject]@{
        Id = 'Rehab-04'
        LabelId = $null
        Slug = 'mammillaria-bombycina'
        ScientificName = 'Mammillaria bombycina'
        CommonName = 'Silken pincushion cactus'
        CommonsCategory = 'Mammillaria bombycina'
        CommonsSearch = 'Mammillaria bombycina'
        INaturalistName = 'Mammillaria bombycina'
        ScopeNote = 'Species-reference photographs for the archived Rehab-04 record; the plant was removed on 2026-07-24 and its photo-based ID remains provisional.'
    },
    [pscustomobject]@{
        Id = 'Houseplant-01'
        LabelId = '#3'
        Slug = 'pachira-glabra'
        ScientificName = 'Pachira glabra'
        CommonName = 'Money tree'
        CommonsCategory = 'Pachira glabra'
        CommonsSearch = 'Pachira glabra'
        INaturalistName = 'Pachira glabra'
        ScopeNote = 'Species-reference photographs; the retail money-tree name is often confused with P. aquatica, so the original tag remains useful evidence.'
    }
)

# Manual visual-QA exclusions. These pages were returned by broad Commons
# category/search results but are either the wrong taxon or visually misleading
# for the stated gallery.
$rejectedSourceUrls = @(
    'https://commons.wikimedia.org/wiki/File:Echinopsis_arachnacantha_subsp._torrecillasensis1PAKAL.jpg',
    'https://commons.wikimedia.org/wiki/File:Echinopsis_arachnacantha_subsp._torrecillasensis2PAKAL.jpg',
    'https://commons.wikimedia.org/wiki/File:Cactus_an%C3%A3o.JPG',
    'https://commons.wikimedia.org/wiki/File:May29@629am.jpg',
    'https://commons.wikimedia.org/wiki/File:Kalanchoe_orgyalis_Garfield_Park.jpg',
    'https://commons.wikimedia.org/wiki/File:2010._%D0%92%D1%8B%D1%81%D1%82%D0%B0%D0%B2%D0%BA%D0%B0_%D1%86%D0%B2%D0%B5%D1%82%D0%BE%D0%B2_%D0%B2_%D0%94%D0%BE%D0%BD%D0%B5%D1%86%D0%BA%D0%B5_%D0%BD%D0%B0_%D0%B4%D0%B5%D0%BD%D1%8C_%D0%B3%D0%BE%D1%80%D0%BE%D0%B4%D0%B0_98.jpg',
    # Grafted, chlorophyll-free moon-cactus scions. The collection plant is a
    # green-and-variegated Gymnocalycium growing on its own roots.
    'https://commons.wikimedia.org/wiki/File:2010._%D0%92%D1%8B%D1%81%D1%82%D0%B0%D0%B2%D0%BA%D0%B0_%D1%86%D0%B2%D0%B5%D1%82%D0%BE%D0%B2_%D0%B2_%D0%94%D0%BE%D0%BD%D0%B5%D1%86%D0%BA%D0%B5_%D0%BD%D0%B0_%D0%B4%D0%B5%D0%BD%D1%8C_%D0%B3%D0%BE%D1%80%D0%BE%D0%B4%D0%B0_100.jpg',
    'https://commons.wikimedia.org/wiki/File:2010._%D0%92%D1%8B%D1%81%D1%82%D0%B0%D0%B2%D0%BA%D0%B0_%D1%86%D0%B2%D0%B5%D1%82%D0%BE%D0%B2_%D0%B2_%D0%94%D0%BE%D0%BD%D0%B5%D1%86%D0%BA%D0%B5_%D0%BD%D0%B0_%D0%B4%D0%B5%D0%BD%D1%8C_%D0%B3%D0%BE%D1%80%D0%BE%D0%B4%D0%B0_101.jpg',
    'https://commons.wikimedia.org/wiki/File:2010._%D0%92%D1%8B%D1%81%D1%82%D0%B0%D0%B2%D0%BA%D0%B0_%D1%86%D0%B2%D0%B5%D1%82%D0%BE%D0%B2_%D0%B2_%D0%94%D0%BE%D0%BD%D0%B5%D1%86%D0%BA%D0%B5_%D0%BD%D0%B0_%D0%B4%D0%B5%D0%BD%D1%8C_%D0%B3%D0%BE%D1%80%D0%BE%D0%B4%D0%B0_39.jpg',
    'https://commons.wikimedia.org/wiki/File:2010._%D0%92%D1%8B%D1%81%D1%82%D0%B0%D0%B2%D0%BA%D0%B0_%D1%86%D0%B2%D0%B5%D1%82%D0%BE%D0%B2_%D0%B2_%D0%94%D0%BE%D0%BD%D0%B5%D1%86%D0%BA%D0%B5_%D0%BD%D0%B0_%D0%B4%D0%B5%D0%BD%D1%8C_%D0%B3%D0%BE%D1%80%D0%BE%D0%B4%D0%B0_75.jpg',
    'https://commons.wikimedia.org/wiki/File:Euphorbia_clava_-_Botanischer_Garten,_Frankfurt_am_Main_-_DSC02365.JPG'
)

# File metadata does not always name a visible flower. These visually checked
# overrides keep the lifecycle labels honest without guessing from plant size.
$subjectOverrides = @{
    'https://commons.wikimedia.org/wiki/File:Cereus_forbesii_7.jpg' = 'flower'
    'https://commons.wikimedia.org/wiki/File:Gymnocalycium_saglionis_2019-06-09_04.jpg' = 'flower'
    'https://commons.wikimedia.org/wiki/File:Gymnocalycium_saglionis_2019-06-09_01.jpg' = 'flower'
    'https://www.inaturalist.org/observations/11066286' = 'flower'
    'https://commons.wikimedia.org/wiki/File:%E4%BB%99%E4%BA%BA%E6%8E%8C-%E7%B7%8B%E7%89%A1%E4%B8%B9%E9%8C%A6_Gymnocalycium_mihanovichii_variegata_-%E9%A6%99%E6%B8%AF%E5%85%AC%E5%9C%92_Hong_Kong_Park-_(9216072982).jpg' = 'flower'
    'https://commons.wikimedia.org/wiki/File:Espostoa_melanostele_pm01.jpg' = 'flower'
    'https://commons.wikimedia.org/wiki/File:Espostoa_melanostele_pm02.jpg' = 'flower'
    'https://commons.wikimedia.org/wiki/File:Espostoa_melanostele_at_Hampton_Court.jpg' = 'habit'
    'https://commons.wikimedia.org/wiki/File:Echinopsis_chamaecereus.2006-06-09.1.uellue.jpg' = 'flower'
    'https://commons.wikimedia.org/wiki/File:Echinopsis_chamaecereus.2006-06-09.2.uellue.jpg' = 'flower'
    'https://commons.wikimedia.org/wiki/File:Echilopsis_chomaecereus-1-sunny_brook-yercaud-salem-India.jpg' = 'habit'
    'https://commons.wikimedia.org/wiki/File:Echilopsis_chomaecereus-2-sunny_brook-yercaud-salem-India.jpg' = 'habit'
    'https://commons.wikimedia.org/wiki/File:Parodia_leninghausii_and_Gasteria_batesiana,_Huntington.jpg' = 'habit'
    'https://commons.wikimedia.org/wiki/File:Mercado_(Dolores_Hidalgo,_Guanajuato)_I.jpg' = 'fruit-seed'
    'https://commons.wikimedia.org/wiki/File:Aeonium_haworthii_1w.jpg' = 'flower'
    'https://commons.wikimedia.org/wiki/File:Aeonium_haworthii_2w.jpg' = 'flower'
    'https://commons.wikimedia.org/wiki/File:Aeonium_haworthii_3w.jpg' = 'flower'
    'https://commons.wikimedia.org/wiki/File:Image_is_Aeonium_haworthii,_also_known_as_Haworth%27s_aeonium_or_pinwheel..jpg' = 'habit'
    'https://commons.wikimedia.org/wiki/File:Pachira_glabra_D5150066.jpg' = 'fruit-seed'
    'https://commons.wikimedia.org/wiki/File:Pachira_glabra-3-NRI_Layout-bengaluru-India.jpg' = 'habit'
}

$selectedPlants = $plantCatalog
$requestedPlantSlugs = @(
    $PlantSlug | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
)
if ($requestedPlantSlugs.Count -gt 0) {
    $unknownSlugs = @($requestedPlantSlugs | Where-Object { $_ -notin $plantCatalog.Slug })
    if ($unknownSlugs.Count -gt 0) {
        throw "Unknown plant slug(s): $($unknownSlugs -join ', ')"
    }

    $selectedPlants = @($plantCatalog | Where-Object { $_.Slug -in $requestedPlantSlugs })
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$assetRoot = Join-Path $repoRoot 'assets\plants'
$manifestPath = Join-Path $assetRoot 'photo-manifest.json'
$attributionPath = Join-Path $assetRoot 'ATTRIBUTION.md'
$indexPath = Join-Path $assetRoot 'README.md'

New-Item -ItemType Directory -Path $assetRoot -Force | Out-Null

function ConvertFrom-HtmlText {
    param([AllowEmptyString()][string] $Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ''
    }

    $withoutTags = [regex]::Replace($Value, '<[^>]+>', ' ')
    $decoded = [System.Net.WebUtility]::HtmlDecode($withoutTags)
    return ([regex]::Replace($decoded, '\s+', ' ')).Trim()
}

function Get-ExtendedMetadataValue {
    param(
        [Parameter(Mandatory)]
        [object] $Metadata,

        [Parameter(Mandatory)]
        [string] $Name
    )

    $property = $Metadata.PSObject.Properties[$Name]
    if ($null -eq $property -or $null -eq $property.Value) {
        return ''
    }

    return ConvertFrom-HtmlText ([string] $property.Value.value)
}

function Get-NormalizedAuthorName {
    param([AllowEmptyString()][string] $Value)

    $authorName = ConvertFrom-HtmlText $Value
    if ($authorName -eq 'Unknown author Unknown author') {
        return 'Unknown author'
    }

    return $authorName
}

function Get-LicenseUrl {
    param(
        [AllowEmptyString()][string] $LicenseName,
        [AllowEmptyString()][string] $ProvidedUrl
    )

    if (-not [string]::IsNullOrWhiteSpace($ProvidedUrl)) {
        if ($ProvidedUrl -match '^http[:]//creativecommons[.]org/') {
            return $ProvidedUrl -replace '^http[:]', 'https:'
        }

        return $ProvidedUrl
    }

    switch -Regex ($LicenseName) {
        'CC0|Public domain' {
            return 'https://creativecommons.org/publicdomain/zero/1.0/'
        }
        'CC BY-SA' {
            return 'https://creativecommons.org/licenses/by-sa/4.0/'
        }
        'CC BY' {
            return 'https://creativecommons.org/licenses/by/4.0/'
        }
        default {
            return ''
        }
    }
}

function Get-PhotoSubject {
    param([string] $Text)

    switch -Regex ($Text) {
        'seedling|juvenile|young plant|one.month|one.year|germinat' {
            return 'young'
        }
        'flower|flor|bloom|blossom|inflorescence|cyath' {
            return 'flower'
        }
        'fruit|berry|berries|seed|capsule' {
            return 'fruit-seed'
        }
        'habitat|wild|nature|natural|reserve|park|parque|cerro|valley|desert|karoo|caatinga' {
            return 'habitat'
        }
        'spine|areole|detail|close|macro|leaf|leaves|rib' {
            return 'detail'
        }
        default {
            return 'habit'
        }
    }
}

function Invoke-JsonRequest {
    param(
        [Parameter(Mandatory)]
        [string] $Uri,

        [Parameter(Mandatory)]
        [hashtable] $Query
    )

    $headers = @{
        'User-Agent' = 'Gardening-research/1.0 (personal collection documentation; Wikimedia and iNaturalist attribution preserved)'
    }

    # Commons can temporarily return 429 responses during an otherwise small,
    # sequential refresh. Keep the retry window long enough to cross that
    # cooldown instead of abandoning the whole manifest near the end.
    $maximumAttempts = 6
    for ($attempt = 1; $attempt -le $maximumAttempts; $attempt++) {
        try {
            return Invoke-RestMethod -Uri $Uri -Body $Query -Method Get -Headers $headers
        } catch {
            if ($attempt -eq $maximumAttempts) {
                throw
            }

            $delaySeconds = [math]::Min(30, [math]::Pow(2, $attempt))
            Write-Warning "Request failed; retrying in $delaySeconds seconds (attempt $attempt of $maximumAttempts)."
            Start-Sleep -Seconds $delaySeconds
        }
    }
}

function Get-ResponseItemList {
    param(
        [AllowNull()]
        [object] $Container,

        [Parameter(Mandatory)]
        [string] $PropertyName
    )

    if ($null -eq $Container) {
        return @()
    }

    $property = $Container.PSObject.Properties[$PropertyName]
    if ($null -eq $property -or $null -eq $property.Value) {
        return @()
    }

    return @($property.Value)
}

function Get-WikimediaCandidateList {
    param([Parameter(Mandatory)][object] $Plant)

    $apiUri = 'https://commons.wikimedia.org/w/api.php'
    $baseQuery = @{
        action = 'query'
        format = 'json'
        formatversion = '2'
        maxlag = '5'
        prop = 'imageinfo'
        iiprop = 'url|mime|extmetadata'
        # Wikimedia asks bulk consumers to use standard thumbnail widths so the
        # CDN can serve cached derivatives instead of rendering custom sizes.
        iiurlwidth = '1280'
    }

    $searchName = if (
        $null -ne $Plant.PSObject.Properties['CommonsSearch'] -and
        -not [string]::IsNullOrWhiteSpace([string] $Plant.CommonsSearch)
    ) {
        [string] $Plant.CommonsSearch
    } else {
        [string] $Plant.ScientificName
    }

    $categoryQuery = $baseQuery.Clone()
    $categoryQuery.generator = 'categorymembers'
    $categoryQuery.gcmtitle = "Category:$($Plant.CommonsCategory)"
    $categoryQuery.gcmtype = 'file'
    $categoryQuery.gcmlimit = '75'

    $responses = [System.Collections.Generic.List[object]]::new()
    $responses.Add((Invoke-JsonRequest -Uri $apiUri -Query $categoryQuery))

    $categoryResponse = $responses[0]
    $categoryQueryResult = if ($null -eq $categoryResponse.PSObject.Properties['query']) {
        $null
    } else {
        $categoryResponse.query
    }
    $categoryPages = @(Get-ResponseItemList -Container $categoryQueryResult -PropertyName 'pages')
    if ($categoryPages.Count -lt [math]::Min(4, $ImagesPerPlant)) {
        Start-Sleep -Milliseconds 900
        $searchQuery = $baseQuery.Clone()
        $searchQuery.generator = 'search'
        $searchQuery.gsrsearch = "`"$searchName`" filetype:bitmap"
        $searchQuery.gsrnamespace = '6'
        $searchQuery.gsrlimit = '40'
        $responses.Add((Invoke-JsonRequest -Uri $apiUri -Query $searchQuery))
    }

    foreach ($stageTerms in @('seedling juvenile', 'flower', 'fruit seed')) {
        Start-Sleep -Milliseconds 900
        $stageSearchQuery = $baseQuery.Clone()
        $stageSearchQuery.generator = 'search'
        $stageSearchQuery.gsrsearch = "`"$searchName`" $stageTerms filetype:bitmap"
        $stageSearchQuery.gsrnamespace = '6'
        $stageSearchQuery.gsrlimit = '40'
        $responses.Add((Invoke-JsonRequest -Uri $apiUri -Query $stageSearchQuery))
    }

    $candidates = [System.Collections.Generic.List[object]]::new()
    foreach ($response in $responses) {
        $queryResult = if ($null -eq $response.PSObject.Properties['query']) {
            $null
        } else {
            $response.query
        }
        foreach ($page in @(Get-ResponseItemList -Container $queryResult -PropertyName 'pages')) {
            $imageInfoItems = @(Get-ResponseItemList -Container $page -PropertyName 'imageinfo')
            if ($imageInfoItems.Count -eq 0) {
                continue
            }

            $imageInfo = $imageInfoItems[0]
            if ([string] $imageInfo.mime -notmatch '^image/(?:jpeg|png|webp)$') {
                continue
            }

            $metadata = $imageInfo.extmetadata
            $licenseName = Get-ExtendedMetadataValue -Metadata $metadata -Name 'LicenseShortName'
            if ($licenseName -notmatch '(?i)^(?:CC0|CC BY(?:-SA)?|Public domain)') {
                continue
            }

            $description = Get-ExtendedMetadataValue -Metadata $metadata -Name 'ImageDescription'
            $objectName = Get-ExtendedMetadataValue -Metadata $metadata -Name 'ObjectName'
            $combinedText = "$($page.title) $objectName $description"
            $licenseUrl = Get-ExtendedMetadataValue -Metadata $metadata -Name 'LicenseUrl'
            $downloadUrl = if ([string]::IsNullOrWhiteSpace([string] $imageInfo.thumburl)) {
                [string] $imageInfo.url
            } else {
                [string] $imageInfo.thumburl
            }

            $candidates.Add([pscustomobject]@{
                PageId = [string] $page.pageid
                Title = (ConvertFrom-HtmlText ([string] $page.title)).Replace('File:', '')
                Description = $description
                Author = Get-NormalizedAuthorName (Get-ExtendedMetadataValue -Metadata $metadata -Name 'Artist')
                License = $licenseName
                LicenseUrl = Get-LicenseUrl -LicenseName $licenseName -ProvidedUrl $licenseUrl
                SourceUrl = [string] $imageInfo.descriptionurl
                DownloadUrl = $downloadUrl
                Mime = [string] $imageInfo.mime
                Subject = Get-PhotoSubject -Text $combinedText
            })
        }
    }

    return @($candidates | Sort-Object PageId -Unique)
}

function Select-DiversePhotoList {
    param(
        [Parameter(Mandatory)]
        [AllowEmptyCollection()]
        [object[]] $Candidates,

        [Parameter(Mandatory)]
        [int] $Limit,

        [string[]] $ExistingSubjects = @()
    )

    $selected = [System.Collections.Generic.List[object]]::new()
    $subjects = @('young', 'flower', 'fruit-seed', 'habitat', 'habit', 'detail')

    foreach ($subject in $subjects) {
        if ($selected.Count -ge $Limit) {
            break
        }
        if ($subject -in $ExistingSubjects) {
            continue
        }

        $selectedSourceUrls = @($selected | ForEach-Object { $_.SourceUrl })
        $candidate = $Candidates |
            Where-Object { $_.Subject -eq $subject -and $_.SourceUrl -notin $selectedSourceUrls } |
            Select-Object -First 1
        if ($null -ne $candidate) {
            $selected.Add($candidate)
        }
    }

    foreach ($candidate in $Candidates) {
        if ($selected.Count -ge $Limit) {
            break
        }

        $selectedSourceUrls = @($selected | ForEach-Object { $_.SourceUrl })
        if ($candidate.SourceUrl -notin $selectedSourceUrls) {
            $selected.Add($candidate)
        }
    }

    return @($selected)
}

function Get-INaturalistCandidateList {
    param([Parameter(Mandatory)][object] $Plant)

    $query = @{
        taxon_name = $Plant.INaturalistName
        photos = 'true'
        photo_license = 'cc0,cc-by,cc-by-sa'
        per_page = '30'
        order_by = 'votes'
        order = 'desc'
    }

    $researchOnly = -not ($Plant.PSObject.Properties.Name -contains 'INaturalistResearchOnly') -or
        [bool] $Plant.INaturalistResearchOnly
    if ($researchOnly) {
        $query.quality_grade = 'research'
    }

    $wildOnly = -not ($Plant.PSObject.Properties.Name -contains 'INaturalistWildOnly') -or
        [bool] $Plant.INaturalistWildOnly
    if ($wildOnly) {
        $query.captive = 'false'
    }

    $response = Invoke-JsonRequest -Uri 'https://api.inaturalist.org/v1/observations' -Query $query
    $candidates = [System.Collections.Generic.List[object]]::new()

    foreach ($observation in @(Get-ResponseItemList -Container $response -PropertyName 'results')) {
        $photos = @(Get-ResponseItemList -Container $observation -PropertyName 'photos')
        if ($photos.Count -eq 0) {
            continue
        }

        $photo = $photos[0]
        $licenseName = ([string] $photo.license_code).ToUpperInvariant()
        if ($licenseName -notin @('CC0', 'CC-BY', 'CC-BY-SA')) {
            continue
        }

        $downloadUrl = ([string] $photo.url) -replace '/square\.', '/large.'
        $licenseDisplay = $licenseName -replace '-', ' '
        $isCaptive = $observation.PSObject.Properties.Name -contains 'captive' -and
            [bool] $observation.captive
        $qualityGrade = [string] $observation.quality_grade
        $observationContext = if ($isCaptive) {
            'Cultivated iNaturalist observation'
        }
        elseif ($qualityGrade -eq 'research') {
            'Research-grade iNaturalist observation'
        }
        else {
            'iNaturalist observation'
        }
        $candidates.Add([pscustomobject]@{
            ObservationId = [string] $observation.id
            PhotoId = [string] $photo.id
            Title = "$($Plant.INaturalistName) reference observation"
            Description = "$observationContext from $($observation.place_guess), observed $($observation.observed_on)."
            Author = [string] $photo.attribution
            License = $licenseDisplay
            LicenseUrl = Get-LicenseUrl -LicenseName $licenseDisplay -ProvidedUrl ''
            SourceUrl = 'https://www.inaturalist.org/observations/' + [string] $observation.id
            DownloadUrl = $downloadUrl
            Mime = if ($downloadUrl -match '\.png(?:\?|$)') { 'image/png' } else { 'image/jpeg' }
            Subject = if ($isCaptive) { 'habit' } else { 'habitat' }
            ObservedOn = [string] $observation.observed_on
            Location = [string] $observation.place_guess
        })
    }

    return @($candidates)
}

function Get-FileExtension {
    param([Parameter(Mandatory)][string] $Mime)

    switch ($Mime) {
        'image/png' { return '.png' }
        'image/webp' { return '.webp' }
        default { return '.jpg' }
    }
}

function Save-RemoteImage {
    param(
        [Parameter(Mandatory)]
        [string] $Uri,

        [Parameter(Mandatory)]
        [string] $Destination
    )

    function Test-ImageSignature {
        param([Parameter(Mandatory)][string] $Path)

        if (-not (Test-Path -LiteralPath $Path) -or (Get-Item -LiteralPath $Path).Length -lt 1024) {
            return $false
        }

        $stream = [System.IO.File]::OpenRead($Path)
        try {
            $bytes = [byte[]]::new(12)
            $read = $stream.Read($bytes, 0, $bytes.Length)
            if ($read -lt 12) {
                return $false
            }

            $isJpeg = $bytes[0] -eq 0xff -and $bytes[1] -eq 0xd8 -and $bytes[2] -eq 0xff
            $isPng = $bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x4e -and $bytes[3] -eq 0x47
            $isWebP = [Text.Encoding]::ASCII.GetString($bytes, 0, 4) -eq 'RIFF' -and
                [Text.Encoding]::ASCII.GetString($bytes, 8, 4) -eq 'WEBP'
            return $isJpeg -or $isPng -or $isWebP
        } finally {
            $stream.Dispose()
        }
    }

    if (Test-ImageSignature -Path $Destination) {
        return
    }

    if (Test-Path -LiteralPath $Destination) {
        Remove-Item -LiteralPath $Destination -Force
    }

    $headers = @{
        'User-Agent' = 'Gardening-research/1.0 (personal collection documentation; source and license recorded)'
    }
    $partialPath = "$Destination.partial"

    for ($attempt = 1; $attempt -le 4; $attempt++) {
        try {
            Invoke-WebRequest -Uri $Uri -OutFile $partialPath -Headers $headers
            if (-not (Test-ImageSignature -Path $partialPath)) {
                throw "Downloaded file is not a recognized JPEG, PNG, or WebP image: $Uri"
            }

            Move-Item -LiteralPath $partialPath -Destination $Destination -Force
            return
        } catch {
            if (Test-Path -LiteralPath $partialPath) {
                Remove-Item -LiteralPath $partialPath -Force
            }

            if ($attempt -eq 4) {
                throw
            }

            Start-Sleep -Seconds 5
        }
    }
}

function ConvertTo-MarkdownCell {
    param([AllowEmptyString()][string] $Value)

    $singleLine = ($Value -replace '\r?\n', ' ').Trim()
    return (($singleLine -replace '\\', '\\') -replace '\|', '\|' -replace '\[', '\[' -replace '\]', '\]')
}

function ConvertTo-MarkdownLinkTarget {
    param([Parameter(Mandatory)][string] $Value)

    # Angle-bracket destinations safely preserve parentheses that commonly
    # occur in Wikimedia file-page URLs.
    return "(<$($Value -replace '>', '%3E')>)"
}

function Get-ProfileGroup {
    param([Parameter(Mandatory)][string] $InventoryId)

    if ($InventoryId.StartsWith('Starter-', [StringComparison]::Ordinal)) {
        return 'starter'
    }
    if ($InventoryId.StartsWith('Succulent-', [StringComparison]::Ordinal)) {
        return 'succulents'
    }
    if ($InventoryId.StartsWith('Cactus-', [StringComparison]::Ordinal)) {
        return 'cacti'
    }
    if ($InventoryId.StartsWith('Rehab-', [StringComparison]::Ordinal)) {
        return 'rehab'
    }
    if ($InventoryId.StartsWith('Houseplant-', [StringComparison]::Ordinal)) {
        return 'houseplants'
    }

    throw "Unknown inventory group for $InventoryId"
}

$existingRecords = @()
$parsedManifest = $null
if (Test-Path -LiteralPath $manifestPath) {
    $parsedManifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    $existingRecords = @(
        $parsedManifest.photos |
            Where-Object { $_.source_url -notin $rejectedSourceUrls }
    )
}

$records = [System.Collections.Generic.List[object]]::new()
foreach ($record in $existingRecords) {
    $catalogPlant = $plantCatalog |
        Where-Object { $_.Slug -eq $record.plant_slug } |
        Select-Object -First 1
    if ($null -eq $catalogPlant) {
        continue
    }

    $recordPath = Join-Path $repoRoot ([string] $record.file).Replace('/', '\')
    if (-not (Test-Path -LiteralPath $recordPath -PathType Leaf)) {
        continue
    }

    $record.plant_id = $catalogPlant.Id
    $record.plant_slug = $catalogPlant.Slug
    $record.scientific_name = $catalogPlant.ScientificName
    $record.common_name = $catalogPlant.CommonName
    $record.scope_note = $catalogPlant.ScopeNote
    if ($subjectOverrides.ContainsKey([string] $record.source_url)) {
        $record.subject = $subjectOverrides[[string] $record.source_url]
    }

    $records.Add($record)
}

foreach ($plant in $selectedPlants) {
    Write-Information "Collecting licensed photographs for $($plant.Id) $($plant.ScientificName)..." -InformationAction Continue

    $plantDirectory = Join-Path $assetRoot $plant.Slug
    New-Item -ItemType Directory -Path $plantDirectory -Force | Out-Null

    $plantRecords = @($records | Where-Object { $_.plant_slug -eq $plant.Slug })
    $needed = [math]::Max(0, $ImagesPerPlant - $plantRecords.Count)

    if ($needed -gt 0) {
        $commonsTarget = $needed
        if ($commonsTarget -gt 0) {
            $commonsCandidates = Get-WikimediaCandidateList -Plant $plant
            $existingSourceUrls = @($records | ForEach-Object { $_.source_url }) + $rejectedSourceUrls
            $commonsCandidates = @(
                $commonsCandidates |
                    Where-Object { $_.SourceUrl -notin $existingSourceUrls }
            )
            $existingSubjects = @($plantRecords | ForEach-Object { $_.subject })
            $selectedCommons = Select-DiversePhotoList `
                -Candidates $commonsCandidates `
                -Limit $commonsTarget `
                -ExistingSubjects $existingSubjects

            foreach ($photo in $selectedCommons) {
                $extension = Get-FileExtension -Mime $photo.Mime
                $fileName = "commons-$($photo.PageId)-$($photo.Subject)$extension"
                $destination = Join-Path $plantDirectory $fileName
                try {
                    Save-RemoteImage -Uri $photo.DownloadUrl -Destination $destination
                } catch {
                    $rejectedSourceUrls += [string] $photo.SourceUrl
                    Write-Warning "Skipping Wikimedia file after repeated download errors: $($photo.SourceUrl)"
                    continue
                }
                Start-Sleep -Milliseconds 1500

                $relativePath = [System.IO.Path]::GetRelativePath($repoRoot, $destination).Replace('\', '/')
                $hash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
                $records.Add([pscustomobject]@{
                    plant_id = $plant.Id
                    plant_slug = $plant.Slug
                    scientific_name = $plant.ScientificName
                    common_name = $plant.CommonName
                    scope_note = $plant.ScopeNote
                    file = $relativePath
                    subject = $photo.Subject
                    title = $photo.Title
                    description = $photo.Description
                    source = 'Wikimedia Commons'
                    source_url = $photo.SourceUrl
                    author = $photo.Author
                    license = $photo.License
                    license_url = $photo.LicenseUrl
                    observed_on = ''
                    location = ''
                    sha256 = $hash
                })
            }
        }

        $plantRecords = @($records | Where-Object { $_.plant_slug -eq $plant.Slug })
        $needed = [math]::Max(0, $ImagesPerPlant - $plantRecords.Count)
    }

    if ($needed -gt 0) {
        Start-Sleep -Milliseconds 900
        $inaturalistCandidates = Get-INaturalistCandidateList -Plant $plant
        $existingSourceUrls = @($records | ForEach-Object { $_.source_url }) + $rejectedSourceUrls
        $selectedINaturalist = @(
            $inaturalistCandidates |
                Where-Object { $_.SourceUrl -notin $existingSourceUrls } |
                Select-Object -First $needed
        )

        foreach ($photo in $selectedINaturalist) {
            $extension = Get-FileExtension -Mime $photo.Mime
            $fileName = "inaturalist-$($photo.ObservationId)-$($photo.PhotoId)-habitat$extension"
            $destination = Join-Path $plantDirectory $fileName
            try {
                Save-RemoteImage -Uri $photo.DownloadUrl -Destination $destination
            } catch {
                $rejectedSourceUrls += [string] $photo.SourceUrl
                Write-Warning "Skipping iNaturalist file after repeated download errors: $($photo.SourceUrl)"
                continue
            }
            Start-Sleep -Milliseconds 1000

            $relativePath = [System.IO.Path]::GetRelativePath($repoRoot, $destination).Replace('\', '/')
            $hash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
            $records.Add([pscustomobject]@{
                plant_id = $plant.Id
                plant_slug = $plant.Slug
                scientific_name = $plant.ScientificName
                common_name = $plant.CommonName
                scope_note = $plant.ScopeNote
                file = $relativePath
                subject = $photo.Subject
                title = $photo.Title
                description = $photo.Description
                source = 'iNaturalist'
                source_url = $photo.SourceUrl
                author = $photo.Author
                license = $photo.License
                license_url = $photo.LicenseUrl
                observed_on = $photo.ObservedOn
                location = $photo.Location
                sha256 = $hash
            })
        }
    }

    $plantRecords = @($records | Where-Object { $_.plant_slug -eq $plant.Slug })
    $needed = [math]::Max(0, $ImagesPerPlant - $plantRecords.Count)
    if ($needed -gt 0) {
        Start-Sleep -Milliseconds 1200
        $commonsCandidates = Get-WikimediaCandidateList -Plant $plant
        $existingSourceUrls = @($records | ForEach-Object { $_.source_url }) + $rejectedSourceUrls
        $commonsCandidates = @(
            $commonsCandidates |
                Where-Object { $_.SourceUrl -notin $existingSourceUrls }
        )
        $existingSubjects = @($plantRecords | ForEach-Object { $_.subject })
        $selectedCommons = Select-DiversePhotoList `
            -Candidates $commonsCandidates `
            -Limit $needed `
            -ExistingSubjects $existingSubjects

        foreach ($photo in $selectedCommons) {
            $extension = Get-FileExtension -Mime $photo.Mime
            $fileName = "commons-$($photo.PageId)-$($photo.Subject)$extension"
            $destination = Join-Path $plantDirectory $fileName
            try {
                Save-RemoteImage -Uri $photo.DownloadUrl -Destination $destination
            } catch {
                $rejectedSourceUrls += [string] $photo.SourceUrl
                Write-Warning "Skipping Wikimedia file after repeated download errors: $($photo.SourceUrl)"
                continue
            }
            Start-Sleep -Milliseconds 1500

            $relativePath = [System.IO.Path]::GetRelativePath($repoRoot, $destination).Replace('\', '/')
            $hash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
            $records.Add([pscustomobject]@{
                plant_id = $plant.Id
                plant_slug = $plant.Slug
                scientific_name = $plant.ScientificName
                common_name = $plant.CommonName
                scope_note = $plant.ScopeNote
                file = $relativePath
                subject = $photo.Subject
                title = $photo.Title
                description = $photo.Description
                source = 'Wikimedia Commons'
                source_url = $photo.SourceUrl
                author = $photo.Author
                license = $photo.License
                license_url = $photo.LicenseUrl
                observed_on = ''
                location = ''
                sha256 = $hash
            })
        }
    }

    Start-Sleep -Milliseconds 900
}

$sortedRecords = @($records | Sort-Object plant_id, source, file)
$generatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
if ($null -ne $parsedManifest) {
    $previousRecords = @(
        $parsedManifest.photos |
            Where-Object { $_.source_url -notin $rejectedSourceUrls } |
            Sort-Object plant_id, source, file
    )
    $previousJson = $previousRecords | ConvertTo-Json -Depth 8 -Compress
    $currentJson = $sortedRecords | ConvertTo-Json -Depth 8 -Compress
    if ($previousJson -ceq $currentJson) {
        $existingGeneratedAt = [string] $parsedManifest.generated_at
        if ($existingGeneratedAt -match '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$') {
            $generatedAt = $existingGeneratedAt
        } else {
            $parsedGeneratedAt = [datetime]::MinValue
            if ([datetime]::TryParse($existingGeneratedAt, [ref] $parsedGeneratedAt)) {
                $generatedAt = $parsedGeneratedAt.ToString('yyyy-MM-ddTHH:mm:ssZ')
            }
        }
    }
}

$manifest = [ordered]@{
    schema_version = 1
    generated_at = $generatedAt
    policy = 'Only CC0, CC BY, CC BY-SA, and public-domain images are downloaded. Attribution and source links are retained per file.'
    photos = $sortedRecords
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding utf8

foreach ($plant in $plantCatalog) {
    $plantRecords = @($sortedRecords | Where-Object { $_.plant_slug -eq $plant.Slug })
    if ($plantRecords.Count -eq 0) {
        continue
    }

    $plantDirectory = Join-Path $assetRoot $plant.Slug
    $profilePath = Join-Path $plantDirectory 'README.md'
    $profileLines = [System.Collections.Generic.List[string]]::new()
    $profileLines.Add("# $($plant.CommonName) photo archive")
    $profileLines.Add('')
    $profileLines.Add("*$($plant.ScientificName)* - $($plant.Id)")
    $profileLines.Add('')
    $labelId = if (-not [string]::IsNullOrWhiteSpace($plant.LabelId)) {
        '`{0}`' -f $plant.LabelId
    } elseif ($plant.PSObject.Properties.Name -contains 'LabelStatus') {
        [string] $plant.LabelStatus
    } else {
        'none (historical record only)'
    }
    $profileLines.Add("Collection label ID: $labelId.")
    $profileLines.Add('')
    $profileLines.Add($plant.ScopeNote)
    $profileLines.Add('')
    $profileGroup = Get-ProfileGroup -InventoryId $plant.Id
    $profileLines.Add(
        "Collection research: [open the plant profile](../../../docs/plants/$profileGroup/$($plant.Slug).md)."
    )
    $profileLines.Add('')
    $profileLines.Add('## Gallery')
    $profileLines.Add('')
    foreach ($record in $plantRecords) {
        $fileName = Split-Path -Leaf $record.file
        $altText = ConvertTo-MarkdownCell "$($record.common_name): $($record.subject)"
        $profileLines.Add("![$altText](./$fileName)")
        $profileLines.Add('')
        $profileLines.Add(
            "*$($record.subject)* - [$((ConvertTo-MarkdownCell $record.title))]$((ConvertTo-MarkdownLinkTarget $record.source_url)); " +
            "$((ConvertTo-MarkdownCell $record.author)); " +
            "[$($record.license)]$((ConvertTo-MarkdownLinkTarget $record.license_url))."
        )
        $profileLines.Add('')
    }
    $profileLines.Add('## File details')
    $profileLines.Add('')
    $profileLines.Add('| File | Subject | Source | Creator | License |')
    $profileLines.Add('| --- | --- | --- | --- | --- |')
    foreach ($record in $plantRecords) {
        $fileName = Split-Path -Leaf $record.file
        $profileLines.Add(
            "| [$fileName](./$fileName) | $((ConvertTo-MarkdownCell $record.subject)) | " +
            "[$($record.source)]$((ConvertTo-MarkdownLinkTarget $record.source_url)) | $((ConvertTo-MarkdownCell $record.author)) | " +
            "[$($record.license)]$((ConvertTo-MarkdownLinkTarget $record.license_url)) |"
        )
    }
    $profileLines.Add('')
    $profileLines.Add('Metadata and SHA-256 hashes are also available in [the global manifest](../photo-manifest.json).')
    $profileLines | Set-Content -LiteralPath $profilePath -Encoding utf8
}

$indexLines = [System.Collections.Generic.List[string]]::new()
$indexLines.Add('# Plant photo archive')
$indexLines.Add('')
$indexLines.Add('These are locally saved reference photographs with reusable licenses. A photo')
$indexLines.Add('shows the documented taxon or its stated reference scope; it is not proof that')
$indexLines.Add('the collection plant has the same identification.')
$indexLines.Add('')
$indexLines.Add('| Inventory ID | Label ID | Plant | Photos | Research | Archive |')
$indexLines.Add('| --- | --- | --- | ---: | --- | --- |')
foreach ($plant in $plantCatalog) {
    $count = @($sortedRecords | Where-Object { $_.plant_slug -eq $plant.Slug }).Count
    $archive = if ($count -gt 0) { "[open](./$($plant.Slug)/)" } else { 'not collected yet' }
    $profileGroup = Get-ProfileGroup -InventoryId $plant.Id
    $profileLink = "[profile](../../docs/plants/$profileGroup/$($plant.Slug).md)"
    $labelId = if ([string]::IsNullOrWhiteSpace($plant.LabelId)) { 'none' } else { '`{0}`' -f $plant.LabelId }
    $indexLines.Add("| $($plant.Id) | $labelId | *$($plant.ScientificName)* - $($plant.CommonName) | $count | $profileLink | $archive |")
}
$indexLines.Add('')
$indexLines.Add('See [ATTRIBUTION.md](./ATTRIBUTION.md) for a compact attribution table and')
$indexLines.Add('[photo-manifest.json](./photo-manifest.json) for machine-readable metadata and hashes.')
$indexLines | Set-Content -LiteralPath $indexPath -Encoding utf8

$attributionLines = [System.Collections.Generic.List[string]]::new()
$attributionLines.Add('# Photo attribution')
$attributionLines.Add('')
$attributionLines.Add('Every downloaded image is listed here. Follow the source and license links for')
$attributionLines.Add('the complete terms and original-resolution file.')
$attributionLines.Add('')
$attributionLines.Add('| Local file | Plant | Source | Creator | License |')
$attributionLines.Add('| --- | --- | --- | --- | --- |')
foreach ($record in $sortedRecords) {
    $attributionLines.Add(
        "| [$($record.file)](../../$($record.file)) | *$($record.scientific_name)* | " +
        "[$($record.source)]$((ConvertTo-MarkdownLinkTarget $record.source_url)) | $((ConvertTo-MarkdownCell $record.author)) | " +
        "[$($record.license)]$((ConvertTo-MarkdownLinkTarget $record.license_url)) |"
    )
}
$attributionLines | Set-Content -LiteralPath $attributionPath -Encoding utf8

Write-Information "Photo archive now contains $($sortedRecords.Count) licensed images." -InformationAction Continue
