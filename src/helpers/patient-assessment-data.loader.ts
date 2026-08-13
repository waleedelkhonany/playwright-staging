/**
 * =============================================================================
 * Patient Assessment Data Loader — JSON-driven test data with dynamic resolution
 * =============================================================================
 *
 * Reads a Patient Assessment scenario JSON file from
 * config/patient-assessment-scenarios/ and resolves each _fields entry using
 * the same rules as the generic loader:
 *
 *   empty string ("")  →  default fallback (empty → field skipped)
 *   "DYNAMIC"          →  auto-generated random value via @faker-js/faker
 *   "{{template}}"     →  resolved template placeholder
 *   anything else      →  used as-is (static value, must match a real option)
 *
 * The target visit ID is NOT read from scenario files — it lives in
 * config/config.json (visitId) so every test uses the same value.
 *
 * Usage in tests:
 *
 *   import config from '../../config/config.json';
 *   import { getPatientAssessmentData } from '../helpers/patient-assessment-data.loader';
 *
 *   const visitId = config.visitId;
 *   const assessment = getPatientAssessmentData('patient-assessment.scenario.json');
 *   await patientAssessmentPage.openVisitPatientAssessment(visitId);
 *   await patientAssessmentPage.fillPatientAssessmentForm(assessment);
 *
 * @see src/helpers/data.loader.ts — generic base used underneath
 */

import { faker } from '@faker-js/faker';
import * as path from 'path';
import { createDataLoader } from './data.loader';
import type { PatientAssessmentData } from '../data/patient-assessment.data';

// =========================================================================
// Loader configuration
// =========================================================================

const DEFAULT_GENERATORS: Record<string, () => string | undefined> = {
  // Every optional field defaults to empty → the page object skips it.
};

const DYNAMIC_GENERATORS: Record<string, () => string> = {
  // Free-text history fields get fresh sentences per run.
  medicalHistory:   () => faker.lorem.sentence(),
  medicationHistory: () => faker.lorem.sentence(),
};

const TEMPLATE_RESOLVERS: Record<string, () => string> = {};

// =========================================================================
// Public API
// =========================================================================

/**
 * Read a Patient Assessment scenario JSON file and return a fully resolved
 * PatientAssessmentData object.
 *
 * @param fileName  File name (e.g. `"patient-assessment.scenario.json"`). The
 *                  file is looked up in `config/patient-assessment-scenarios/`.
 * @param overrides Optional overrides to merge on top of the resolved data.
 *
 * @example
 *   const assessment = getPatientAssessmentData('patient-assessment.scenario.json');
 */
export const getPatientAssessmentData = createDataLoader<PatientAssessmentData>({
  name: 'PatientAssessmentData',
  dataDir: path.resolve(__dirname, '..', '..', 'config', 'patient-assessment-scenarios'),
  defaults: DEFAULT_GENERATORS,
  dynamic: DYNAMIC_GENERATORS,
  templates: TEMPLATE_RESOLVERS,
});
