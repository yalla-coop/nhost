import { useDialog } from '@/components/common/DialogProvider';
import { Form } from '@/components/form/Form';
import { Alert } from '@/components/ui/v2/Alert';
import { Box } from '@/components/ui/v2/Box';
import { Button } from '@/components/ui/v2/Button';
import { InfoIcon } from '@/components/ui/v2/icons/InfoIcon';
import { Input } from '@/components/ui/v2/Input';
import { Text } from '@/components/ui/v2/Text';
import { Tooltip } from '@/components/ui/v2/Tooltip';
import { useCurrentWorkspaceAndProject } from '@/features/projects/common/hooks/useCurrentWorkspaceAndProject';
import { InfoCard } from '@/features/projects/overview/components/InfoCard';
import {
  MAX_SERVICES_CPU,
  MAX_SERVICES_MEM,
  MAX_SERVICE_REPLICAS,
  MIN_SERVICES_CPU,
  MIN_SERVICES_MEM,
} from '@/features/projects/resources/settings/utils/resourceSettingsValidationSchema';
import { ComputeFormSection } from '@/features/services/components/ServiceForm/components/ComputeFormSection';
import { EnvironmentFormSection } from '@/features/services/components/ServiceForm/components/EnvironmentFormSection';
import { PortsFormSection } from '@/features/services/components/ServiceForm/components/PortsFormSection';
import { ReplicasFormSection } from '@/features/services/components/ServiceForm/components/ReplicasFormSection';
import { StorageFormSection } from '@/features/services/components/ServiceForm/components/StorageFormSection';
import type { DialogFormProps } from '@/types/common';
import { getToastStyleProps } from '@/utils/constants/settings';
import {
  useInsertRunServiceConfigMutation,
  useInsertRunServiceMutation,
  useReplaceRunServiceConfigMutation,
  type ConfigRunServiceConfigInsertInput,
} from '@/utils/__generated__/graphql';
import type { ApolloError } from '@apollo/client';
import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { parse } from 'shell-quote';
import * as Yup from 'yup';

export enum PortTypes {
  HTTP = 'http',
  TCP = 'tcp',
  UDP = 'udp',
}

export const validationSchema = Yup.object({
  name: Yup.string().required('The name is required.'),
  image: Yup.string().label('Image to run'),
  command: Yup.string(),
  environment: Yup.array().of(
    Yup.object().shape({
      name: Yup.string().required(),
      value: Yup.string().required(),
    }),
  ),
  compute: Yup.object({
    cpu: Yup.number().min(MIN_SERVICES_CPU).max(MAX_SERVICES_CPU).required(),
    memory: Yup.number().min(MIN_SERVICES_MEM).max(MAX_SERVICES_MEM).required(),
  }),
  replicas: Yup.number().min(0).max(MAX_SERVICE_REPLICAS).required(),
  ports: Yup.array().of(
    Yup.object().shape({
      port: Yup.number().required(),
      type: Yup.mixed<PortTypes>().oneOf(Object.values(PortTypes)).required(),
      publish: Yup.boolean().default(false),
    }),
  ),
  storage: Yup.array().of(
    Yup.object()
      .shape({
        name: Yup.string().required(),
        path: Yup.string().required(),
        capacity: Yup.number().nonNullable().required(),
      })
      .required(),
  ),
});

export type ServiceFormValues = Yup.InferType<typeof validationSchema>;

export interface ServiceFormProps extends DialogFormProps {
  /**
   * To use in conjunction with initialData to allow for updating the service
   */
  serviceID?: string;

  /**
   * if there is initialData then it's an update operation
   */
  initialData?: ServiceFormValues;

  /**
   * Function to be called when the operation is cancelled.
   */
  onCancel?: VoidFunction;
  /**
   * Function to be called when the submit is successful.
   */
  onSubmit?: VoidFunction | ((args?: any) => Promise<any>);
}

export default function ServiceForm({
  serviceID,
  initialData,
  onSubmit,
  onCancel,
  location,
}: ServiceFormProps) {
  const { onDirtyStateChange } = useDialog();
  const [insertRunService] = useInsertRunServiceMutation();
  const { currentProject } = useCurrentWorkspaceAndProject();
  const [insertRunServiceConfig] = useInsertRunServiceConfigMutation();
  const [replaceRunServiceConfig] = useReplaceRunServiceConfigMutation();

  const [createServiceFormError, setCreateServiceFormError] =
    useState<Error | null>(null);

  const form = useForm<ServiceFormValues>({
    defaultValues: initialData ?? {
      compute: {
        cpu: 62,
        memory: 128,
      },
      replicas: 1,
    },
    reValidateMode: 'onSubmit',
    resolver: yupResolver(validationSchema),
  });

  const {
    watch,
    register,
    formState: { errors, isSubmitting, dirtyFields },
  } = form;

  const serviceImage = watch('image');

  const isDirty = Object.keys(dirtyFields).length > 0;

  useEffect(() => {
    onDirtyStateChange(isDirty, location);
  }, [isDirty, location, onDirtyStateChange]);

  const createOrUpdateService = async (values: ServiceFormValues) => {
    const config: ConfigRunServiceConfigInsertInput = {
      name: values.name,
      image: {
        image: values.image,
      },
      command: parse(values.command).map((item) => item.toString()),
      resources: {
        compute: {
          cpu: values.compute.cpu,
          memory: values.compute.memory,
        },
        storage: values.storage.map((item) => ({
          name: item.name,
          path: item.path,
          capacity: item.capacity,
        })),
        replicas: values.replicas,
      },
      environment: values.environment.map((item) => ({
        name: item.name,
        value: item.value,
      })),
      ports: values.ports.map((item) => ({
        port: item.port,
        type: item.type,
        publish: item.publish,
      })),
    };

    if (initialData) {
      // Update service config
      await replaceRunServiceConfig({
        variables: {
          appID: currentProject.id,
          serviceID,
          config,
        },
      });
    } else {
      // Insert service config
      const {
        data: {
          insertRunService: { id: newServiceID },
        },
      } = await insertRunService({
        variables: {
          object: {
            appID: currentProject.id,
          },
        },
      });

      await insertRunServiceConfig({
        variables: {
          appID: currentProject.id,
          serviceID: newServiceID,
          config: {
            ...config,
            image: {
              // If the image field left empty then we auto-populate following this format
              // registry.<region>.<nhost_domain>/<service_id>
              image:
                values.image.length > 0
                  ? values.image
                  : `registry.${currentProject.region.awsName}.${currentProject.region.domain}/${newServiceID}`,
            },
          },
        },
      });
    }
  };

  const handleSubmit = async (values: ServiceFormValues) => {
    try {
      await toast.promise(
        createOrUpdateService(values),
        {
          loading: 'Configuring the service...',
          success: `The service has been configured successfully.`,
          error: (arg: ApolloError) => {
            // we need to get the internal error message from the GraphQL error
            const { internal } = arg.graphQLErrors[0]?.extensions || {};
            const { message } = (internal as Record<string, any>)?.error || {};

            // we use the default Apollo error message if we can't find the
            // internal error message
            return (
              message ||
              arg.message ||
              'An error occurred while configuring the service. Please try again.'
            );
          },
        },
        getToastStyleProps(),
      );

      // await refetchWorkspaceAndProject();
      // refestch the services
      onSubmit?.();
    } catch {
      // Note: The toast will handle the error.
    }
  };

  return (
    <FormProvider {...form}>
      <Form
        onSubmit={handleSubmit}
        className="grid grid-flow-row gap-4 px-6 pb-6"
      >
        <Input
          {...register('name')}
          id="name"
          label={
            <Box className="flex flex-row items-center space-x-2">
              <Text>Name</Text>
              <Tooltip title="Name of the service, must be unique per project.">
                <InfoIcon
                  aria-label="Info"
                  className="h-4 w-4"
                  color="primary"
                />
              </Tooltip>
            </Box>
          }
          placeholder="Service name"
          hideEmptyHelperText
          error={!!errors.name}
          helperText={errors?.name?.message}
          fullWidth
          autoComplete="off"
          autoFocus
        />

        <Input
          {...register('image')}
          id="image"
          label={
            <Box className="flex flex-row items-center space-x-2">
              <Text>Image</Text>
              <Tooltip
                title={
                  <span>
                    Image to use, it can be hosted on any public registry or it
                    can use the{' '}
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href="https://docs.nhost.io/run/registry"
                      className="underline"
                    >
                      Nhost registry
                    </a>
                    . Image needs to support arm.
                  </span>
                }
              >
                <InfoIcon
                  aria-label="Info"
                  className="h-4 w-4"
                  color="primary"
                />
              </Tooltip>
            </Box>
          }
          placeholder="To automatically fill the private registry, leave it blank."
          hideEmptyHelperText
          error={!!errors.image}
          helperText={errors?.image?.message}
          fullWidth
          autoComplete="off"
        />

        {/* This shows only when trying to edit a service */}
        {serviceID && serviceImage && (
          <InfoCard
            title="Private registry"
            value={`registry.${currentProject.region.awsName}.${currentProject.region.domain}/${serviceID}`}
          />
        )}

        <Input
          {...register('command')}
          id="command"
          label={
            <Box className="flex flex-row items-center space-x-2">
              <Text>Command</Text>
              <Tooltip title="Command to run when to start the service. This is optional as the image may already have a baked-in command.">
                <InfoIcon
                  aria-label="Info"
                  className="h-4 w-4"
                  color="primary"
                />
              </Tooltip>
            </Box>
          }
          placeholder="$ npm start"
          hideEmptyHelperText
          error={!!errors.command}
          helperText={errors?.command?.message}
          fullWidth
          autoComplete="off"
        />

        <ComputeFormSection />

        <ReplicasFormSection />

        <EnvironmentFormSection />

        <PortsFormSection />

        <StorageFormSection />

        {createServiceFormError && (
          <Alert
            severity="error"
            className="grid grid-flow-col items-center justify-between px-4 py-3"
          >
            <span className="text-left">
              <strong>Error:</strong> {createServiceFormError.message}
            </span>

            <Button
              variant="borderless"
              color="error"
              size="small"
              onClick={() => {
                setCreateServiceFormError(null);
              }}
            >
              Clear
            </Button>
          </Alert>
        )}
        <div className="grid grid-flow-row gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {initialData ? 'Update' : 'Create'}
          </Button>

          <Button variant="outlined" color="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </Form>
    </FormProvider>
  );
}
