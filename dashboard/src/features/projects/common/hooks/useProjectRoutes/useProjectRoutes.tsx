import { useUI } from '@/components/common/UIProvider';
import { CloudIcon } from '@/components/ui/v2/icons/CloudIcon';
import { CogIcon } from '@/components/ui/v2/icons/CogIcon';
import { DatabaseIcon } from '@/components/ui/v2/icons/DatabaseIcon';
import { FileTextIcon } from '@/components/ui/v2/icons/FileTextIcon';
import { GaugeIcon } from '@/components/ui/v2/icons/GaugeIcon';
import { GraphQLIcon } from '@/components/ui/v2/icons/GraphQLIcon';
import { HasuraIcon } from '@/components/ui/v2/icons/HasuraIcon';
import { HomeIcon } from '@/components/ui/v2/icons/HomeIcon';
import { RocketIcon } from '@/components/ui/v2/icons/RocketIcon';
import { ServicesIcon } from '@/components/ui/v2/icons/ServicesIcon';
import { StorageIcon } from '@/components/ui/v2/icons/StorageIcon';
import type { SvgIconProps } from '@/components/ui/v2/icons/SvgIcon';
import { UserIcon } from '@/components/ui/v2/icons/UserIcon';
import { useCurrentWorkspaceAndProject } from '@/features/projects/common/hooks/useCurrentWorkspaceAndProject';
import { useIsPlatform } from '@/features/projects/common/hooks/useIsPlatform';
import { useHypertune } from '@/hooks/useHypertune';
import type { ReactElement } from 'react';

export interface ProjectRoute {
  /**
   * Path relative to the workspace and project root.
   *
   * @example
   * ```
   * '/sample-path' => '/<workspace-slug>/<project-slug>/sample-path'
   * ```
   */
  relativePath: string;
  /**
   * Main path of the route relative to the workspace and project root.
   *
   * @example
   * ```
   * '/sample-path' => '/<workspace-slug>/<project-slug>/sample-path/sample-sub-path'
   * ```
   */
  relativeMainPath?: string;
  /**
   * Label of the route.
   */
  label: string;
  /**
   * Determines whether the route should be active even if the href is not
   * exactly the same as the current path, but starts with it.
   */
  exact?: boolean;
  /**
   * Icon to display for the route.
   */
  icon?: ReactElement<SvgIconProps>;
  /**
   * Determines whether the route should be disabled.
   */
  disabled?: boolean;
}

export default function useProjectRoutes() {
  const isPlatform = useIsPlatform();
  const { maintenanceActive } = useUI();
  const {
    currentWorkspace,
    currentProject,
    loading: currentProjectLoading,
  } = useCurrentWorkspaceAndProject();

  const hypertune = useHypertune();

  const enableServices =
    currentWorkspace &&
    hypertune
      .root({
        context: {
          workSpace: {
            id: currentWorkspace.id,
          },
        },
      })
      .enableServices({})
      .get(false);

  const nhostRoutes: ProjectRoute[] = [
    {
      relativePath: '/deployments',
      exact: false,
      label: 'Deployments',
      icon: <RocketIcon />,
      disabled: !isPlatform,
    },
    {
      relativePath: '/backups',
      exact: false,
      label: 'Backups',
      icon: <CloudIcon />,
      disabled: !isPlatform,
    },
    {
      relativePath: '/logs',
      exact: false,
      label: 'Logs',
      icon: <FileTextIcon />,
      disabled: !isPlatform,
    },
    {
      relativePath: '/metrics',
      exact: false,
      label: 'Metrics',
      icon: <GaugeIcon />,
      disabled: !isPlatform,
    },
    {
      relativeMainPath: '/settings',
      relativePath: '/settings/general',
      exact: false,
      label: 'Settings',
      icon: <CogIcon />,
      disabled: !isPlatform || maintenanceActive,
    },
  ];

  let allRoutes: ProjectRoute[] = [
    {
      relativePath: '/',
      exact: true,
      label: 'Overview',
      icon: <HomeIcon />,
    },
    {
      relativePath: '/database/browser/default',
      exact: false,
      label: 'Database',
      icon: <DatabaseIcon />,
    },
    {
      relativePath: '/graphql',
      exact: true,
      label: 'GraphQL',
      icon: <GraphQLIcon />,
    },
    {
      relativePath: '/hasura',
      exact: true,
      label: 'Hasura',
      icon: <HasuraIcon />,
      disabled: !currentProject?.config?.hasura.settings?.enableConsole,
    },
    {
      relativePath: '/users',
      exact: false,
      label: 'Auth',
      icon: <UserIcon />,
    },
    {
      relativePath: '/storage',
      exact: false,
      label: 'Storage',
      icon: <StorageIcon />,
    },
  ];

  if (enableServices) {
    allRoutes.push({
      relativePath: '/services',
      exact: false,
      label: 'Run',
      icon: <ServicesIcon />,
    });
  }

  allRoutes = [...allRoutes, ...nhostRoutes];

  return {
    nhostRoutes,
    allRoutes,
    loading: currentProjectLoading,
  };
}
