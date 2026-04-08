import { VERSION } from '../version'

const major = VERSION.split('.')[0]
export const STORE_KEY = `echo-storage-v${major}`
