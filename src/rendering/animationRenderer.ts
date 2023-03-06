import { LimitClock, roundToN } from '../util/misc'
import { ProgressBarController } from '../util/progress'
import { AJBone } from './bone'
import { Gimbals, Vector } from './linear'

let progress: ProgressBarController

function eulerToXyz(euler: THREE.Euler) {
	const a = new THREE.Quaternion().setFromEuler(euler)
	const b = new THREE.Euler().setFromQuaternion(a, 'XYZ')
	return b
}

function recurseBoneStructure(group: Group): AJBone {
	let rot: ArrayVector3, pos: ArrayVector3
	if (group.name === 'ANIMATED_JAVA_VIRTUAL_ROOT') {
		rot = group.rotation
		pos = group.origin
	} else {
		const e = eulerToXyz(group.mesh.rotation)
		rot = [e.x, e.y, e.z].map(r => r * (180 / Math.PI)) as ArrayVector3
		pos = group.mesh.position.toArray()
	}
	return new AJBone({
		name: group.name,
		origin: Vector.fromArray(pos),
		rot: Gimbals.fromArray(rot),
		scale: new Vector(1, 1, 1),
		children: group.children
			.filter(c => c instanceof Group)
			.map(c => recurseBoneStructure(c as Group)),
	})
}

export function getBones() {
	const virtualRoot = new Group({
		name: 'ANIMATED_JAVA_VIRTUAL_ROOT',
		origin: [0, 0, 0],
		rotation: [0, 0, 0],
	})
	virtualRoot.children = [...Outliner.root]
	return recurseBoneStructure(virtualRoot)
}

function getVariantKeyframe(animation: _Animation, time: number) {
	if (!animation.animators.effects?.variants) return
	for (const kf of animation.animators.effects.variants as _Keyframe[]) {
		if (kf.time === time)
			return {
				uuid: kf.data_points[0].variant,
				condition: kf.data_points[0].condition,
			}
	}
}

function getCommandsKeyframe(animation: _Animation, time: number) {
	if (!animation.animators.effects?.commands) return
	for (const kf of animation.animators.effects.commands as _Keyframe[]) {
		if (kf.time === time)
			return {
				commands: kf.data_points[0].commands,
				condition: kf.data_points[0].condition,
			}
	}
}

function getAnimationStateKeyframe(animation: _Animation, time: number) {
	if (!animation.animators.effects?.animationStates) return
	for (const kf of animation.animators.effects.animationStates as _Keyframe[]) {
		if (kf.time === time)
			return {
				animation: kf.data_points[0].animationState,
				condition: kf.data_points[0].condition,
			}
	}
}

function updatePreview(animation: _Animation, time: number) {
	Timeline.time = time
	Animator.showDefaultPose(true)
	Animator.resetLastValues()
	for (const node of [
		...Group.all,
		...NullObject.all,
		...Locator.all,
		...OutlinerElement.types.camera.all,
	]) {
		animation.getBoneAnimator(node).displayFrame(1)
		if (animation.effects) animation.effects.displayFrame()
	}
	Animator.resetLastValues()
	scene.updateMatrixWorld()
	if (Group.selected) {
		Transformer.updateSelection()
	}
	Blockbench.dispatchEvent('display_animation_frame')
}

export interface IRenderedAnimation {
	name: string
	frames: Array<{
		bones: AJBone[]
		variant?: {
			uuid: string
			condition: string
		}
		commands?: {
			commands: string
			condition: string
		}
		animationState?: {
			animation: string
			condition: string
		}
	}>
}

export async function renderAnimation(animation: _Animation) {
	const rendered = { name: animation.name, frames: [] } as IRenderedAnimation
	animation.select()

	const bones = getBones()
	const clock = new LimitClock(10)

	for (let time = 0; time <= animation.length; time = roundToN(time + 0.05, 20)) {
		// await new Promise(resolve => requestAnimationFrame(resolve))
		// await new Promise(resolve => setTimeout(resolve, 50))
		updatePreview(animation, time)
		rendered.frames.push({
			bones: bones.exportRoot(),
			variant: getVariantKeyframe(animation, time),
			commands: getCommandsKeyframe(animation, time),
			animationState: getAnimationStateKeyframe(animation, time),
		})
		await clock.sync()
	}
	return rendered
}

export async function renderAllAnimations() {
	let selectedAnimation: _Animation | undefined
	let currentTime = 0
	progress = new ProgressBarController('Rendering Animations...', Animator.animations.length)
	// Save selected animation
	if (Mode.selected.id === 'animate') {
		selectedAnimation = Animator.selected
		currentTime = Timeline.time
	}

	const animations: IRenderedAnimation[] = []

	for (const animation of Animator.animations) {
		animations.push(await renderAnimation(animation))
		progress.add(1)
	}

	// Restore selected animation
	if (Mode.selected.id === 'animate' && selectedAnimation) {
		selectedAnimation.select()
		Timeline.setTime(currentTime)
		Animator.preview()
	} else if (Mode.selected.id === 'edit') {
		Animator.showDefaultPose()
	}

	return animations
}
