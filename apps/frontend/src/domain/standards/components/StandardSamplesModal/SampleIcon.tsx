import * as React from 'react';
import type { IconType } from 'react-icons';
import { FaJava } from 'react-icons/fa';
import { LuDatabase, LuCode } from 'react-icons/lu';
import {
  SiAngular,
  SiAnsible,
  SiC,
  SiCplusplus,
  SiSharp,
  SiDjango,
  SiDotnet,
  SiExpress,
  SiFastapi,
  SiFlask,
  SiFlutter,
  SiGo,
  SiIonic,
  SiJavascript,
  SiKotlin,
  SiLaravel,
  SiMeteor,
  SiNestjs,
  SiNextdotjs,
  SiNuxtdotjs,
  SiPhp,
  SiPython,
  SiReact,
  SiRuby,
  SiRubyonrails,
  SiRust,
  SiSpringboot,
  SiSvelte,
  SiSwift,
  SiSymfony,
  SiTerraform,
  SiTypescript,
  SiVuedotjs,
  SiZend,
} from 'react-icons/si';
import { PMIcon } from '@packmind/ui';

const sampleIconMap: Record<string, IconType> = {
  // Languages
  python: SiPython,
  c: SiC,
  java: FaJava,
  cpp: SiCplusplus,
  csharp: SiSharp,
  javascript: SiJavascript,
  sql: LuDatabase,
  go: SiGo,
  php: SiPhp,
  rust: SiRust,
  swift: SiSwift,
  typescript: SiTypescript,
  kotlin: SiKotlin,
  ruby: SiRuby,
  // Frameworks
  react: SiReact,
  'react-native': SiReact,
  django: SiDjango,
  angular: SiAngular,
  ansible: SiAnsible,
  terraform: SiTerraform,
  vue: SiVuedotjs,
  'spring-boot': SiSpringboot,
  laravel: SiLaravel,
  flask: SiFlask,
  'dotnet-core': SiDotnet,
  rails: SiRubyonrails,
  svelte: SiSvelte,
  symfony: SiSymfony,
  nextjs: SiNextdotjs,
  nuxtjs: SiNuxtdotjs,
  nestjs: SiNestjs,
  meteor: SiMeteor,
  fastapi: SiFastapi,
  flutter: SiFlutter,
  zend: SiZend,
  express: SiExpress,
  ionic: SiIonic,
};

interface ISampleIconProps {
  sampleId: string;
  boxSize?: number;
  color?: string;
}

export const SampleIcon: React.FC<ISampleIconProps> = ({
  sampleId,
  boxSize = 5,
  color = 'text.secondary',
}) => {
  const IconComponent = sampleIconMap[sampleId] ?? LuCode;

  return (
    <PMIcon asChild boxSize={boxSize} color={color}>
      <IconComponent />
    </PMIcon>
  );
};
