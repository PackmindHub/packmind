import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';

export const DETECTION_QUERY_SCOPE = 'detection';

export enum DetectionQueryKeys {
  GET_ACTIVE_DETECTION_PROGRAMS = 'get-active-detection-programs',
  GET_ALL_DETECTION_PROGRAMS = 'get-all-detection-programs',
  GET_DETECTION_PROGRAM_METADATA = 'get-detection-program-metadata',
  GET_RULE_DETECTION_ASSESSMENT = 'get-rule-detection-assessment',
  GET_RULE_LANGUAGE_DETECTION_STATUS = 'get-rule-language-detection-status',
  GET_STANDARD_RULES_DETECTION_STATUS = 'get-standard-rules-detection-status',
  GET_DETECTION_HEURISTICS = 'get-detection-heuristics',
}

// Base query key arrays for reuse
export const GET_ACTIVE_DETECTION_PROGRAMS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DETECTION_QUERY_SCOPE,
  DetectionQueryKeys.GET_ACTIVE_DETECTION_PROGRAMS,
] as const;

export const GET_ALL_DETECTION_PROGRAMS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DETECTION_QUERY_SCOPE,
  DetectionQueryKeys.GET_ALL_DETECTION_PROGRAMS,
] as const;

export const GET_DETECTION_PROGRAM_METADATA_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DETECTION_QUERY_SCOPE,
  DetectionQueryKeys.GET_DETECTION_PROGRAM_METADATA,
] as const;

export const GET_RULE_DETECTION_ASSESSMENT_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DETECTION_QUERY_SCOPE,
  DetectionQueryKeys.GET_RULE_DETECTION_ASSESSMENT,
] as const;

export const GET_RULE_LANGUAGE_DETECTION_STATUS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DETECTION_QUERY_SCOPE,
  DetectionQueryKeys.GET_RULE_LANGUAGE_DETECTION_STATUS,
] as const;

export const GET_STANDARD_RULES_DETECTION_STATUS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DETECTION_QUERY_SCOPE,
  DetectionQueryKeys.GET_STANDARD_RULES_DETECTION_STATUS,
] as const;

export const GET_DETECTION_HEURISTICS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  DETECTION_QUERY_SCOPE,
  DetectionQueryKeys.GET_DETECTION_HEURISTICS,
] as const;
