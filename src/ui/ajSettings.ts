import { translate } from '../util/translation'
import { SvelteDialog } from './svelteDialog'
import SettingsComponent from './components/animatedJavaSettings.svelte'
import { animatedJavaSettings } from '../settings'

export function openAjSettingsDialog() {
	new SvelteDialog({
		title: translate('animated_java.dialog.settings.title'),
		id: 'animated_java:settings',
		width: 700,
		buttons: [translate('animated_java.dialog.close_button')],
		svelteComponent: SettingsComponent,
		svelteComponentProps: { settings: animatedJavaSettings },
	}).show()
}
