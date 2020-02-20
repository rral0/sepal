import api from 'api'
import {of} from 'rxjs'
import {map} from 'rxjs/operators'
import EarthEngineLayer from './earthEngineLayer'
import {sepalMap} from './map'

export const setEETableLayer = (
    {
        contextId,
        layerSpec: {id, tableId, columnName, columnValue, layerIndex = 0},
        destroy$,
        onInitialized
    }) => {
    const watchedProps = {tableId, columnName, columnValue}
    const layer = columnValue
        ? new RecipeGeometryLayer({
            mapId$: api.gee.eeTableMap$({tableId, columnName, columnValue, color: '#FFFFFF50', fillColor: '#FFFFFF08'}),
            layerIndex,
            watchedProps
        }) : null
    sepalMap.getContext(contextId).setLayer({id, layer, destroy$, onInitialized})
    return layer
}

class RecipeGeometryLayer extends EarthEngineLayer {
    constructor({mapId$, layerIndex, watchedProps}) {
        super({layerIndex, mapId$, props: watchedProps})
    }

    initialize$() {
        if (this.token)
            return of(this)
        return this.mapId$.pipe(
            map(({token, mapId, urlTemplate, bounds}) => {
                this.token = token
                this.mapId = mapId
                this.urlTemplate = urlTemplate
                this.bounds = bounds
                return this
            })
        )
    }
}
