import React from 'react';
import { invoke } from '@tauri-apps/api/core';
type DirTreeNode = {
	name: string;
	path: string;
	isDir: boolean;
	children?: DirTreeNode[];
};

// ...pozostałe importy i kod...
