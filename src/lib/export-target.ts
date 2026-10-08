import type { KnowledgeAsset, AssetType } from './types';

export interface AssetFileExport {
  filename: string;
  type: AssetType;
  content: string;
}

export function serializeAsset(asset: KnowledgeAsset, filename: string): string {
  const data = asset.asset_data;
  if (asset.asset_type === 'master' || asset.asset_type === 'summary') {
    return (data as { content?: string })?.content || '';
  }
  return JSON.stringify(data, null, 2);
}

/**
 * Format all package assets into a map of filename -> content
 */
export function prepareAssetsForExport(
  assets: KnowledgeAsset[],
  filenameMap: Record<AssetType, string>
): AssetFileExport[] {
  const result: AssetFileExport[] = [];

  for (const asset of assets) {
    const filename = filenameMap[asset.asset_type] || `${asset.asset_type}.json`;
    result.push({
      filename,
      type: asset.asset_type,
      content: serializeAsset(asset, filename),
    });
  }

  return result;
}

/**
 * Native Browser Directory Picker (File System Access API)
 * Allows the user to select the website's project folder (e.g. projects/apzurquelle/ai_knowledge)
 * and directly writes all generated files to that folder on disk.
 */
export async function exportToDirectoryPicker(
  assetExports: AssetFileExport[]
): Promise<{ success: boolean; dirName: string; written: string[] }> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error(
      'Directory Picker is not supported in this browser. Please use Chrome/Edge or the Gateway Sync option.'
    );
  }

  // @ts-expect-error - File System Access API
  const dirHandle = await window.showDirectoryPicker({
    mode: 'readwrite',
    startIn: 'documents',
  });

  const written: string[] = [];

  for (const item of assetExports) {
    const fileHandle = await dirHandle.getFileHandle(item.filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(item.content);
    await writable.close();
    written.push(item.filename);
  }

  return {
    success: true,
    dirName: dirHandle.name,
    written,
  };
}

/**
 * Sync knowledge files directly to the Webpage Master Gateway API
 * (Default endpoint: http://localhost:5174/api/save-knowledge)
 */
export async function exportToGatewayApi(options: {
  gatewayUrl?: string;
  projectName: string;
  assetExports: AssetFileExport[];
}): Promise<{ success: boolean; message: string; written: string[] }> {
  const gatewayUrl = (options.gatewayUrl || 'http://localhost:5174').replace(/\/+$/, '');
  const targetEndpoint = `${gatewayUrl}/api/save-knowledge`;

  const filesPayload: Record<string, string> = {};
  for (const item of options.assetExports) {
    filesPayload[item.filename] = item.content;
  }

  const response = await fetch(targetEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      project: options.projectName,
      files: filesPayload,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gateway returned HTTP ${response.status}: ${errText}`);
  }

  const resJson = await response.json();
  return {
    success: true,
    message: resJson.message || `Saved ${options.assetExports.length} files to projects/${options.projectName}/ai_knowledge`,
    written: Object.keys(filesPayload),
  };
}
