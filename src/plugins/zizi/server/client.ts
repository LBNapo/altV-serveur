import * as alt from 'alt-client';
import { useWebview } from '@Client/webview/index.js';

const webview = useWebview();

webview.on('copyToClipboard', (text: string) => {
    alt.copyToClipboard(text);
});
