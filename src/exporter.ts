import { IRenderedAnimation } from './rendering/renderer'
import { Setting as AJSetting, AnimatedJavaSettings } from './settings'
import { GUIStructure } from './ui/ajUIStructure'
import { consoleGroup } from './util/console'

type ProjectSettings = Record<string, AJSetting<any>>

interface IAnimatedJavaExporterOptions<S extends ProjectSettings> {
	id: string
	name: string
	description: string
	getSettings(): S
	settingsStructure: GUIStructure
	export(
		ajSettings: typeof AnimatedJavaSettings,
		projectSettings: ModelProject['animated_java_settings'],
		exporterSettings: S,
		renderedAnimations: IRenderedAnimation[]
	): Promise<void>
}

export class _AnimatedJavaExporter<S extends ProjectSettings = Record<string, AJSetting<any>>> {
	static exporters = new Map<string, _AnimatedJavaExporter<any>>()
	id: string
	name: string
	description: string
	getSettings: IAnimatedJavaExporterOptions<S>['getSettings']
	settingsStructure: GUIStructure
	export: IAnimatedJavaExporterOptions<S>['export']
	constructor(options: IAnimatedJavaExporterOptions<S>) {
		this.id = options.id
		this.name = options.name
		this.description = options.description
		this.getSettings = options.getSettings
		this.settingsStructure = options.settingsStructure
		this.export = consoleGroup(`Exporting with ${this.name} (${this.id})`, options.export)

		_AnimatedJavaExporter.exporters.set(this.id, this)
	}

	static get all() {
		return [...AnimatedJavaExporter.exporters.entries()].map(v => v[1])
	}
}
