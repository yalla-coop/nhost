import Form from '@/components/common/Form';
import Button from '@/ui/v2/Button';
import Text from '@/ui/v2/Text';
import hasuraMetadataQuery from '@/utils/msw/mocks/hasuraMetadataQuery';
import tableQuery from '@/utils/msw/mocks/tableQuery';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import type { ColumnAutocompleteProps } from './ColumnAutocomplete';
import ColumnAutocomplete from './ColumnAutocomplete';

export default {
  title: 'Data Browser / ColumnAutocomplete',
  component: ColumnAutocomplete,
  parameters: {
    docs: {
      source: {
        type: 'code',
      },
    },
  },
} as ComponentMeta<typeof ColumnAutocomplete>;

const Template: ComponentStory<typeof ColumnAutocomplete> = function Template(
  args: ColumnAutocompleteProps,
) {
  const [submittedValues, setSubmittedValues] = useState<string>('');

  const form = useForm<{ firstReference: string; secondReference: string }>({
    defaultValues: {
      firstReference: null,
      secondReference: null,
    },
  });

  function handleSubmit(values: {
    firstReference: string;
    secondReference: string;
  }) {
    setSubmittedValues(JSON.stringify(values, null, 2));
  }

  return (
    <div className="grid grid-flow-row gap-2">
      <FormProvider {...form}>
        <Form onSubmit={handleSubmit} className="grid grid-flow-row gap-2">
          <ColumnAutocomplete
            {...args}
            name="firstReference"
            label="First Reference"
            onChange={(_event, value) =>
              form.setValue('firstReference', value.value, {
                shouldDirty: true,
              })
            }
          />
          <ColumnAutocomplete
            {...args}
            name="secondReference"
            label="Second Reference"
            onChange={(_event, value) =>
              form.setValue('secondReference', value.value, {
                shouldDirty: true,
              })
            }
          />

          <Button type="submit" className="justify-self-start">
            Submit
          </Button>
        </Form>
      </FormProvider>

      <Text component="pre" className="!font-mono !text-gray-700">
        {submittedValues || 'The form has not been submitted yet.'}
      </Text>
    </div>
  );
};

export const Default = Template.bind({});

Default.args = {
  schema: 'public',
  table: 'books',
};

Default.parameters = {
  nextRouter: {
    path: '/[workspaceSlug]/[appSlug]/database/browser/[dataSourceSlug]/[schemaSlug]/[tableSlug]',
    asPath: '/workspace/app/database/browser/default/public/users',
    query: {
      workspaceSlug: 'workspace',
      appSlug: 'app',
      dataSourceSlug: 'default',
      schemaSlug: 'public',
      tableSlug: 'books',
    },
  },
  msw: {
    handlers: [tableQuery, hasuraMetadataQuery],
  },
};
