declare module 'virtual:lecons' {
	const lecons: import('./schema.ts').Lecon[];
	export default lecons;
	export const pointsDePassage: import('./schema.ts').PointDePassage[];
}
