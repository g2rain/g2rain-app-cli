/** @deprecated Prefer family-specific placeholder writers via the family registry. */
export {
  replaceFrontendAppPlaceholders as replaceTemplatePlaceholders,
  rewriteFrontendAppPackageJson as rewritePackageJson,
} from '../families/frontend-app/placeholders.js';
