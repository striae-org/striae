// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import styles from './form.module.css';

interface FormMessageProps {
	type: 'error' | 'success';
	title?: string;
	message: string;
	className?: string;
}

export const FormMessage = ({ type, title, message, className }: FormMessageProps) => {
	return (
		<div className={`${styles[`${type}Message`]} ${className || ''}`}>
			{title && (
				<h2>
					<strong>{title}</strong>
				</h2>
			)}
			<p>{message}</p>
		</div>
	);
};
