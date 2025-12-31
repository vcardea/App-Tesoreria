import { contextBridge } from 'electron';
contextBridge.exposeInMainWorld('api', { status: 'ok' });