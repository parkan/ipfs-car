import fs from 'fs'
import os from 'os'

import { CID } from 'multiformats'
import { BlockstoreAdapter } from 'interface-blockstore'
import { Blockstore } from './index'

export class FsBlockStore extends BlockstoreAdapter implements Blockstore {
  path: string
  _opened: boolean
  _opening?: Promise<void>

  constructor () {
    super()
    this.path = `${os.tmpdir()}/${(parseInt(String(Math.random() * 1e9), 10)).toString() + Date.now()}`
    this._opened = false
  }

  async _open () {
    if (this._opening) {
      await this._opening
    } else {
      this._opening = fs.promises.mkdir(this.path)
      await this._opening
      this._opened = true
    }
  }

  async put (cid: CID, bytes: Uint8Array) {
    if (!this._opened) {
      await this._open()
    }

    const cidStr = cid.toString()
    const location = `${this.path}/${cidStr}`
    await fs.promises.writeFile(location, bytes)
  }

  async get (cid: CID): Promise<Uint8Array> {
    if (!this._opened) {
      await this._open()
    }

    const cidStr = cid.toString()
    const location = `${this.path}/${cidStr}`
    const bytes = await fs.promises.readFile(location)

    return bytes
  }

  async has (cid: CID) {
    if (!this._opened) {
      await this._open()
    }

    const cidStr = cid.toString()
    const location = `${this.path}/${cidStr}`
    try {
      await fs.promises.access(location)
      return true
    } catch (err) {
      return false
    }
  }

  async * blocks () {
    if (!this._opened) {
      await this._open()
    }

    const cids = await fs.promises.readdir(this.path)

    for (const cidStr of cids) {
      const location = `${this.path}/${cidStr}`
      const bytes = await fs.promises.readFile(location)

      yield { cid: CID.parse(cidStr), bytes }
    }
  }

  async close () {
    if (this._opened) {
      await fs.promises.rm(this.path, { recursive: true })
    }
    this._opened = false
  }
}
