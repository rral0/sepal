import {RecipeFormPanel, recipeFormPanel} from 'app/home/body/process/recipeFormPanel'
import {compose} from 'compose'
import _ from 'lodash'
import PropTypes from 'prop-types'
import React from 'react'
import {selectFrom} from 'stateUtils'
import {msg} from 'translate'
import {FormButtons as Buttons} from 'widget/buttons'
import {Field, FieldSet} from 'widget/form'
import {FormPanelButtons} from 'widget/formPanel'
import Label from 'widget/label'
import {PanelContent, PanelHeader} from 'widget/panel'
import Slider from 'widget/slider'
import {RecipeActions} from '../../mosaicRecipe'
import styles from './compositeOptions.module.css'

const fields = {
    corrections: new Field(),
    shadowPercentile: new Field(),
    hazePercentile: new Field(),
    ndviPercentile: new Field(),
    dayOfYearPercentile: new Field(),
    mask: new Field(),
    cloudBuffer: new Field(),
    compose: new Field()
}

const mapRecipeToProps = recipe => ({
    sources: selectFrom(recipe, 'model.sources')
})

class CompositeOptions extends React.Component {
    render() {
        const {recipeId} = this.props
        return (
            <RecipeFormPanel
                className={styles.panel}
                placement='bottom-right'
                onClose={() => RecipeActions(recipeId).showPreview().dispatch()}>
                <PanelHeader
                    icon='layer-group'
                    title={msg('process.mosaic.panel.composite.title')}/>
                <PanelContent>
                    {this.renderContent()}
                </PanelContent>
                <FormPanelButtons/>
            </RecipeFormPanel>
        )
    }

    renderContent() {
        return (
            <FieldSet>
                {this.renderCorrectionOptions()}
                <FieldSet compact>
                    {this.renderFilterOptions()}
                </FieldSet>
                <FieldSet horizontal>
                    {this.renderMaskOptions()}
                    {this.renderCloudBufferOptions()}
                    {this.renderComposeOptions()}
                </FieldSet>
            </FieldSet>
        )
    }

    renderCorrectionOptions() {
        const {inputs: {corrections}, sources} = this.props
        const includesSentinel2 = Object.keys(sources).includes('SENTINEL_2')
        return (
            <Buttons
                label={msg('process.mosaic.panel.composite.form.corrections.label')}
                input={corrections}
                multiple={true}
                options={[{
                    value: 'SR',
                    label: msg('process.mosaic.panel.composite.form.corrections.surfaceReflectance.label'),
                    tooltip: msg('process.mosaic.panel.composite.form.corrections.surfaceReflectance.tooltip')
                }, {
                    value: 'BRDF',
                    label: msg('process.mosaic.panel.composite.form.corrections.brdf.label'),
                    tooltip: msg('process.mosaic.panel.composite.form.corrections.brdf.tooltip'),
                    neverSelected: includesSentinel2
                }, {
                    value: 'CALIBRATE',
                    label: msg('process.mosaic.panel.composite.form.corrections.calibrate.label'),
                    tooltip: msg('process.mosaic.panel.composite.form.corrections.calibrate.tooltip'),
                    neverSelected: _.flatten(Object.values(sources)).length < 2
                        || corrections.value.includes('SR')
                }]}
            />
        )
    }

    renderFilterOptions() {
        const {
            inputs: {corrections, shadowPercentile, hazePercentile, ndviPercentile, dayOfYearPercentile}
        } = this.props
        return (
            <React.Fragment>
                <Label
                    msg={msg('process.mosaic.panel.composite.form.filters.label')}
                    tooltip={msg('process.mosaic.panel.composite.form.filters.tooltip')}
                    tooltipPlacement='topLeft'/>
                <PercentileField
                    input={shadowPercentile}/>
                <PercentileField
                    input={hazePercentile}
                    disabled={corrections.value.includes('SR')}/>
                <PercentileField
                    input={ndviPercentile}/>
                <PercentileField
                    input={dayOfYearPercentile}/>
            </React.Fragment>
        )
    }

    renderMaskOptions() {
        const {inputs: {mask}} = this.props
        return (
            <Buttons
                label={msg('process.mosaic.panel.composite.form.mask.label')}
                input={mask}
                multiple={true}
                options={[{
                    value: 'CLOUDS',
                    label: msg('process.mosaic.panel.composite.form.mask.clouds.label'),
                    tooltip: msg('process.mosaic.panel.composite.form.mask.clouds.tooltip')
                }, {
                    value: 'SNOW',
                    label: msg('process.mosaic.panel.composite.form.mask.snow.label'),
                    tooltip: msg('process.mosaic.panel.composite.form.mask.snow.tooltip')
                }]}
                type='horizontal-nowrap'
            />
        )
    }

    renderCloudBufferOptions() {
        const {inputs: {cloudBuffer}} = this.props
        return (
            <Buttons
                label={msg('process.mosaic.panel.composite.form.cloudBuffer.label')}
                input={cloudBuffer}
                options={[{
                    value: 0,
                    label: msg('process.mosaic.panel.composite.form.cloudBuffer.none.label'),
                    tooltip: msg('process.mosaic.panel.composite.form.cloudBuffer.none.tooltip')
                }, {
                    value: 90,
                    label: msg('process.mosaic.panel.composite.form.cloudBuffer.moderate.label'),
                    tooltip: msg('process.mosaic.panel.composite.form.cloudBuffer.moderate.tooltip')
                }, {
                    value: 300,
                    label: msg('process.mosaic.panel.composite.form.cloudBuffer.aggressive.label'),
                    tooltip: msg('process.mosaic.panel.composite.form.cloudBuffer.aggressive.tooltip')
                }]}
                type='horizontal-nowrap'
            />
        )
    }

    renderComposeOptions() {
        const {inputs: {compose}} = this.props
        return (
            <Buttons
                label={msg('process.mosaic.panel.composite.form.composingMethod.label')}
                input={compose}
                options={[{
                    value: 'MEDOID',
                    label: msg('process.mosaic.panel.composite.form.composingMethod.medoid.label'),
                    tooltip: msg('process.mosaic.panel.composite.form.composingMethod.medoid.tooltip')
                }, {
                    value: 'MEDIAN',
                    label: msg('process.mosaic.panel.composite.form.composingMethod.median.label'),
                    tooltip: msg('process.mosaic.panel.composite.form.composingMethod.median.tooltip')
                }]}
                type='horizontal-nowrap'
            />
        )
    }

    componentDidMount() {
        const {recipeId, inputs: {cloudBuffer}} = this.props
        RecipeActions(recipeId).hidePreview().dispatch()
        if (cloudBuffer.value === undefined)
            cloudBuffer.set(0)
    }
}

CompositeOptions.propTypes = {
    disabled: PropTypes.any,
    recipeId: PropTypes.string,
    sources: PropTypes.any
}

const PercentileField = ({input, disabled = false}) => {
    return (
        <Slider
            input={input}
            minValue={0}
            maxValue={100}
            ticks={[0, 10, 25, 50, 75, 90, 100]}
            snap
            range='high'
            info={percentile => {
                const type = percentile === 0 ? 'off' : percentile === 100 ? 'max' : 'percentile'
                return msg(['process.mosaic.panel.composite.form.filters', input.name, type], {percentile})
            }}
            disabled={disabled}/>
    )
}

PercentileField.propTypes = {
    disabled: PropTypes.any,
    input: PropTypes.object
}

const valuesToModel = values => ({
    corrections: values.corrections,
    filters: [
        {type: 'SHADOW', percentile: values.shadowPercentile},
        {type: 'HAZE', percentile: values.hazePercentile},
        {type: 'NDVI', percentile: values.ndviPercentile},
        {type: 'DAY_OF_YEAR', percentile: values.dayOfYearPercentile},
    ].filter(({percentile}) => percentile),
    mask: values.mask,
    cloudBuffer: values.cloudBuffer,
    compose: values.compose,
})

const modelToValues = model => {
    const getPercentile = type => {
        const filter = model.filters.find(filter => filter.type === type)
        return filter ? filter.percentile : 0
    }
    return ({
        corrections: model.corrections,
        shadowPercentile: getPercentile('SHADOW'),
        hazePercentile: getPercentile('HAZE'),
        ndviPercentile: getPercentile('NDVI'),
        dayOfYearPercentile: getPercentile('DAY_OF_YEAR'),
        mask: model.mask,
        cloudBuffer: model.cloudBuffer,
        compose: model.compose,
    })
}

const additionalPolicy = () => ({sceneSelection: 'allow'})

const panelOptions = {
    id: 'compositeOptions',
    fields,
    mapRecipeToProps,
    modelToValues,
    valuesToModel,
    additionalPolicy
}

export default compose(
    CompositeOptions,
    recipeFormPanel(panelOptions)
)
