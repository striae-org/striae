// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { useRef, useState, useEffect, useCallback } from 'react';
import { resetFileInput } from '../utils/file-validation';
import styles from '../case-import.module.css';

interface FileSelectorProps {
	selectedFile: File | null;
	onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
	isDisabled: boolean;
	onClear?: () => void;
	onFileSelectDirect?: (file: File) => void; // For drag and drop
}

export const FileSelector = ({ selectedFile, onFileSelect, isDisabled, onClear, onFileSelectDirect }: FileSelectorProps) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const isMountedRef = useRef(true);
	const [isDragOver, setIsDragOver] = useState(false);

	useEffect(() => {
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	const handleClear = () => {
		resetFileInput(fileInputRef);
		onClear?.();
	};

	const handleDragOver = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			if (!isDisabled && isMountedRef.current) {
				setIsDragOver(true);
			}
		},
		[isDisabled],
	);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		const relatedTarget = e.relatedTarget as HTMLElement | null;
		if (!relatedTarget || !e.currentTarget?.contains(relatedTarget)) {
			if (isMountedRef.current) {
				setIsDragOver(false);
			}
		}
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			if (isMountedRef.current) {
				setIsDragOver(false);
			}
			if (isDisabled || !isMountedRef.current) return;

			const files = e.dataTransfer.files;
			if (files.length > 0) {
				const file = files[0];

				// Check file type (same as input accept attribute)
				const isValidType = file.name.toLowerCase().endsWith('.zip');

				if (isValidType) {
					if (onFileSelectDirect) {
						onFileSelectDirect(file);
					} else {
						// Fallback: simulate file input change event
						const dataTransfer = new DataTransfer();
						dataTransfer.items.add(file);
						if (fileInputRef.current) {
							fileInputRef.current.files = dataTransfer.files;
							const input = fileInputRef.current;
							const event = new Event('change', { bubbles: true });
							Object.defineProperty(event, 'target', { value: input, enumerable: true });
							onFileSelect(event as unknown as React.ChangeEvent<HTMLInputElement>);
						}
					}
				} else {
					console.warn('Invalid file type dropped:', file.name);
				}
			}
		},
		[isDisabled, onFileSelectDirect, onFileSelect],
	);

	return (
		<div className={styles.fileSection}>
			<div className={styles.fileInputGroup}>
				<input
					ref={fileInputRef}
					type="file"
					id="zipFile"
					accept=".zip"
					onChange={onFileSelect}
					disabled={isDisabled}
					className={styles.fileInput}
					aria-label="File picker for ZIP packages"
				/>
				<div
					className={`${styles.fileLabel} ${isDragOver ? styles.fileLabelDragOver : ''}`}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					onClick={() => {
						if (!isDisabled) {
							fileInputRef.current?.click();
						}
					}}
					role="button"
					tabIndex={isDisabled ? -1 : 0}
					aria-disabled={isDisabled}
					aria-label="File selection area. Drag and drop a case ZIP or encrypted confirmation ZIP package for import."
					onKeyDown={(e) => {
						if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
							if (e.key === ' ') {
								e.preventDefault();
							}
							fileInputRef.current?.click();
						}
					}}
				>
					<div className={styles.fileLabelContent}>
						<span className={styles.fileLabelIcon}>📁</span>
						<span className={styles.fileLabelText}>
							{selectedFile ? selectedFile.name : isDragOver ? 'Drop file here...' : 'Select ZIP package... or drag & drop'}
						</span>
					</div>
				</div>

				{/* Clear button positioned in upper right corner */}
				{selectedFile && onClear && (
					<button
						type="button"
						onClick={handleClear}
						className={styles.clearFileButton}
						disabled={isDisabled}
						title="Clear selected file"
						aria-label="Clear selected file"
					>
						×
					</button>
				)}
			</div>

			{selectedFile && (
				<div className={styles.fileInfo}>
					<span className={styles.fileSize}>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
				</div>
			)}
		</div>
	);
};
