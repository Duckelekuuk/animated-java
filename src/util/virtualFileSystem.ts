import { isValidDatapackName } from '../minecraft/util'

class VirtualNode {
	constructor(public name: string, public parent?: VirtualNode) {}

	/**
	 * The path to this folder, relative to the root of the virtual file system
	 */
	get path(): string {
		return this.parent ? `${this.parent.path}/${this.name}` : this.name
	}

	accessParent() {
		if (this.parent === undefined) throw new Error('Cannot access parent of root folder')
		return this.parent
	}
}

export class VirtualFolder extends VirtualNode {
	childCount = 0
	children: Array<VirtualFolder | VirtualFile> = []
	constructor(name: string, parent?: VirtualFolder) {
		super(name, parent)
		isValidDatapackName(name, 'folder')
	}

	protected addChild() {
		if (this.parent instanceof VirtualFolder) this.parent.addChild()
		this.childCount++
	}

	/**
	 * Create a new file in this folder
	 * @param name The name of the file to create. If the name contains slashes, the parent folders will be created recursively.
	 * @param content The content of the file. If content is an Array of strings each string will be treated as a new line in the file.
	 * @returns The created VirtualFile, or throws if it already exists
	 */
	newFile(name: string, content: VirtualFileContent): VirtualFile | never {
		const parts = name.split('/')
		if (parts.length > 1) {
			let child = this.children.find(
				child => child instanceof VirtualFolder && child.name === parts[0]
			) as VirtualFolder | undefined

			if (child === undefined) {
				child = this.newFolder(parts[0])
			}

			this.addChild()
			return child.newFile(parts.slice(1).join('/'), content)
		}

		if (this.children.find(child => child instanceof VirtualFile && child.fileName === name))
			throw new Error(`File ${this.path}/${name} already exists`)
		const file = new VirtualFile(name, this, content)
		this.children.push(file)
		this.addChild()
		return file
	}

	/**
	 * Create a new folder (or folders) in this folder
	 * @param name The name of the folder to create. If the name contains slashes, the parent folders will be created recursively.
	 * @returns The created folder, or throws if it already exists
	 */
	newFolder(name: string): VirtualFolder | never {
		const parts = name.split('/').filter(part => part.length > 0)

		if (parts.length > 1) {
			let child = this.children.find(
				child => child instanceof VirtualFolder && child.name === parts[0]
			) as VirtualFolder | undefined

			if (child === undefined) {
				child = this.newFolder(parts[0])
			}

			this.addChild()
			return child.newFolder(parts.slice(1).join('/'))
		}

		if (this.children.find(child => child instanceof VirtualFolder && child.name === name))
			throw new Error(`Folder ${this.path}/${name} already exists`)
		const folder = new VirtualFolder(name, this)
		this.children.push(folder)
		this.addChild()
		return folder
	}

	/**
	 * Create multiple new folders in this folder
	 * @param names The names of the folders to create. If the name contains slashes, the parent folders will be created recursively.
	 * @returns The created folders, or throws if any of them already exist
	 */
	newFolders(...names: string[]): VirtualFolder[] | never {
		return names.map(name => this.newFolder(name))
	}

	/**
	 * Create a new file in this folder, and return the parent folder
	 * @param name The name of the file to create. If the name contains slashes, the parent folders will be created recursively.
	 * @param content The content of the file. If content is an Array of strings each string will be treated as a new line in the file.
	 * @returns The folder this function was called on
	 */
	chainNewFile(name: string, content: VirtualFileContent): VirtualFolder | never {
		this.newFile(name, content)
		return this
	}

	/**
	 * Create a new file in this folder, and return the parent folder
	 * @param name The name of the file to create. If the name contains slashes, the parent folders will be created recursively.
	 * @returns The folder this function was called on
	 */
	chainNewFolder(name: string): VirtualFolder | never {
		this.newFolder(name)
		return this
	}

	/**
	 * Access a child folder of this folder by path
	 * @param path The path to the child, relative to this folder
	 * @returns The child, or throws if it doesn't exist
	 */
	accessFolder(path: string): VirtualFolder | never {
		const parts = path.split('/')
		const name = parts[0]
		const child = this.children.find(
			child => child instanceof VirtualFolder && child.name === name
		)
		if (!(child instanceof VirtualFolder))
			throw new Error(`No folder named ${name} in ${this.path}`)
		if (!child) throw new Error(`No child named ${name} in ${this.path}`)
		if (parts.length === 1) return child
		if (child instanceof VirtualFolder) return child.accessFolder(parts.slice(1).join('/'))
		throw new Error(`Cannot access child of file ${this.path}/${name}`)
	}

	/**
	 * Access a child file of this folder by path
	 * @param path The path to the child, relative to this folder
	 * @returns The child, or throws if it doesn't exist
	 */
	accessFile(path: string): VirtualFile | never {
		const parts = path.split('/')
		const name = parts[0]
		const child = this.children.find(
			child => child instanceof VirtualFile && child.fileName === name
		)
		if (!(child instanceof VirtualFile))
			throw new Error(`No file named ${name} in ${this.path}`)
		if (!child) throw new Error(`No child named ${name} in ${this.path}`)
		if (parts.length === 1) return child
		if (child instanceof VirtualFolder) return child.accessFile(parts.slice(1).join('/'))
		throw new Error(`Cannot access child of file ${this.path}/${name}`)
	}

	async writeToDisk(outputFolder: string, progressCallback?: (change: number) => void) {
		const path = PathModule.join(outputFolder, this.path)
		await fs.promises.mkdir(path, { recursive: true })
		if (progressCallback) progressCallback(1)
		for (const child of this.children) {
			await child.writeToDisk(outputFolder, progressCallback)
		}
	}
}

type VirtualFileContent = string | Buffer | Uint8Array | string[] | any
export class VirtualFile extends VirtualNode {
	public ext: string
	constructor(
		public fileName: string,
		public parent: VirtualFolder,
		public content: VirtualFileContent
	) {
		const [name, ext] = fileName.split('.')
		super(name, parent)
		this.ext = ext
		isValidDatapackName(this.name, 'file')
	}

	async writeToDisk(outputFolder: string, progressCallback?: (change: number) => void) {
		const path = PathModule.join(outputFolder, this.parent.path, this.fileName)

		let content: string | Buffer | Uint8Array
		if (Array.isArray(this.content)) {
			content = this.content.join('\n')
		} else if (
			this.content instanceof Buffer ||
			this.content instanceof Uint8Array ||
			typeof this.content === 'string'
		) {
			content = this.content
		} else {
			content = JSON.stringify(this.content)
		}

		await fs.promises.writeFile(path, content, { encoding: 'utf-8' })
		if (progressCallback) progressCallback(1)
	}
}
