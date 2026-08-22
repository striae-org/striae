import { type CaseData, type ReadOnlyCaseData } from '~/types';

const CASE_NUMBER_REGEX = /^[A-Za-z0-9-]+$/;
const MAX_CASE_NUMBER_LENGTH = 25;

export const validateCaseNumber = (caseNumber: string): boolean => {
	return CASE_NUMBER_REGEX.test(caseNumber) && caseNumber.length <= MAX_CASE_NUMBER_LENGTH;
};

export const sortCaseNumbers = (cases: string[]): string[] => {
	return cases.sort((a, b) => {
		const getComponents = (str: string) => {
			const numbers = str.match(/\d+/g)?.map(Number) || [];
			const letters = str.match(/[A-Za-z]+/g)?.join('') || '';
			return { numbers, letters };
		};

		const aComponents = getComponents(a);
		const bComponents = getComponents(b);

		const maxLength = Math.max(aComponents.numbers.length, bComponents.numbers.length);
		for (let i = 0; i < maxLength; i++) {
			const aNum = aComponents.numbers[i] || 0;
			const bNum = bComponents.numbers[i] || 0;
			if (aNum !== bNum) return aNum - bNum;
		}

		return aComponents.letters.localeCompare(bComponents.letters);
	});
};

export const isReadOnlyCaseData = (caseData: CaseData): caseData is ReadOnlyCaseData => {
	return 'isReadOnly' in caseData && typeof (caseData as ReadOnlyCaseData).isReadOnly === 'boolean';
};
