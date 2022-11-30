// @ts-ignore
import en from './lang/en.yaml'

type TranslationFormattingObject = Record<string, string>

const languages: Record<string, string> = {
	en,
}

function format(str: string, dict: TranslationFormattingObject = {}) {
	// Sort the keys by size. This makes sure %a and %abc aren't confused.
	const keys = Object.keys(dict).sort((a, b) => b.length - a.length)
	for (const target of keys) str = str.replace(new RegExp('%' + target, 'g'), dict[target])
	return str
}

// @ts-ignore
//!! This may need to be updated inside of a Blockbench post-startup event instead of immediately
export let currentLanguage = settings.language.value

// interface IYamlFile {
// 	[name: string]: string | IYamlFile | Array<IYamlFile>
// }

// function getTranslatedString(str: String) {
// 	let parts = str.split('.')
// 	let localObject: IYamlFile = {}
// 	for (const part of parts) {
// 		const value = localObject[part]
// 		if (typeof value == 'string' || Array.isArray(value)) return value
// 		else localObject = value
// 	}
// }

export function translate(key: string, formattingObject?: TranslationFormattingObject): string {
	let translated = languages[currentLanguage][key]
	// Return the translation key if no valid translation is found.
	if (translated == undefined) return key
	// If a formatting object is provided, use it to format the translated string.
	if (formattingObject != undefined) return format(translated, formattingObject)
	return translated
}
