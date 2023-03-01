import { ajModelFormat } from '../modelFormat'
import { createBlockbenchMod } from '../util/mods'
import { TextureId } from '../variants'

declare global {
	interface Texture {
		toTextureId(): TextureId
	}
}

createBlockbenchMod(
	'animated_java:texture_toTextureId',
	{
		original: Texture.prototype.remove,
	},
	context => {
		Texture.prototype.toTextureId = function (this: Texture) {
			return `${this.uuid}::${this.name}`
		}
		Texture.prototype.remove = function (this: Texture) {
			if (!Project) return
			const x = context.original.call(this)
			// Remove all texture mappings that use this texture
			if (Format.id === ajModelFormat.id) {
				Project.animated_java_variants!.verifyTextures(true)
			}
			return x
		}
	},
	context => {
		// @ts-ignore
		delete Texture.prototype.toTextureId
		Texture.prototype.remove = context.original
	}
)
