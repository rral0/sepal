/**
 * @author Mino Togna
 */

//scene area selection
var sceneAreaId      = null
var sceneAreaImages  = []
// var sceneAreaImages  = {}
var sceneAreaSensors = []
// selection
var selectedImages   = {}

var key = function ( image ) {
    return image.sceneId
}

var setSceneArea = function ( id, images ) {
    sceneAreaId      = id
    sceneAreaImages  = images
    // sceneAreaImages  = {}
    sceneAreaSensors = []
    
    $.each( images, function ( i, image ) {
        // sceneAreaImages[ key( image ) ] = image
        
        if ( sceneAreaSensors.indexOf( image.sensor ) < 0 ) {
            sceneAreaSensors.push( image.sensor )
        }
        
    } )
    // console.log( sceneAreaSensors )
}

var getSceneAreaImages = function ( sortWeight ) {
    var ccWeight = 1 - sortWeight
    var tdWeight = sortWeight
    
    var images = sceneAreaImages.slice()
    images     = images.sort( function ( a, b ) {
        var weightA = a.cloudCover * ccWeight + a.daysFromTargetDay * tdWeight
        var weightB = b.cloudCover * ccWeight + b.daysFromTargetDay * tdWeight
        return weightA - weightB
    } )
    
    return images
}

var getSceneAreaSensors = function () {
    return sceneAreaSensors
}

var getSceneAreaId = function () {
    return sceneAreaId
}

var getSceneAreaSelectedImages = function ( sceneAreaId ) {
    return selectedImages[ sceneAreaId ]
}

var getSelectedSceneIds = function () {
    var selectedScenes = []
    $.each( Object.keys( selectedImages ), function ( i, sceneAreaId ) {
        var selection = selectedImages[ sceneAreaId ]
        // console.log( Object.keys( selection ) )
        // selectedScenes.push( Object.keys( selection ) )
        $.each( Object.keys( selection ), function ( j, sceneImageId ) {
            selectedScenes.push( sceneImageId )
        } )
    } )
    return selectedScenes
}

var isSceneSelected = function ( scene ) {
    var sceneId        = key( scene )
    var selectedScenes = getSceneAreaSelectedImages( getSceneAreaId() )
    var selected       = selectedScenes && Object.keys( selectedScenes ).indexOf( sceneId ) >= 0
    return selected
}

var select = function ( sceneArea, image ) {
    if ( !selectedImages[ sceneArea ] ) {
        selectedImages[ sceneArea ] = {}
    }
    
    var k                            = key( image )
    selectedImages[ sceneArea ][ k ] = image
}

var deselect = function ( sceneArea, image ) {
    var k = key( image )
    delete selectedImages[ sceneArea ][ k ]
    if ( Object.keys( selectedImages[ sceneArea ] ).length <= 0 ) {
        delete selectedImages[ sceneArea ]
    }
}

var reset = function () {
    sceneAreaImages  = []
    // sceneAreaImages  = {}
    sceneAreaId      = null
    sceneAreaSensors = []
    selectedImages   = {}
}

var areasSelection = function () {
    return Object.keys( selectedImages )
}

module.exports = {
    setSceneArea                : setSceneArea
    , getSceneAreaImages        : getSceneAreaImages
    , select                    : select
    , deselect                  : deselect
    , isSceneSelected           : isSceneSelected
    , reset                     : reset
    , getSceneAreaId            : getSceneAreaId
    , getSceneAreaSelectedImages: getSceneAreaSelectedImages
    , getSelectedSceneIds       : getSelectedSceneIds
    , areasSelection            : areasSelection
    , getSceneAreaSensors       : getSceneAreaSensors
}