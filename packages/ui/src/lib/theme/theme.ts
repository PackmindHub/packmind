import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';
import pmHeadingRecipe from '../components/typography/PMHeading.recipe';
import pmTextRecipe from '../components/typography/PMText.recipe';
import { pmTableRecipe } from '../components/content/PMTable.recipe';
import { pmButtonRecipe } from '../components/form/PMButton/PMButton.recipe';
import { pmMenuRecipe } from '../components/form/PMMenu/PMMenu.recipe';
import { pmLinkRecipe } from '../components/typography/PMLink.recipe';
import { pmTabsRecipe } from '../components/navigation/PMTabs/PMTabs.recipe';
import { pmTimelineRecipe } from '../components/content/PMTimeline/PMTimeline.recipe';
import { pmComboboxRecipe } from '../components/form/PMCombobox/PMCombobox.recipe';
import { pmToasterRecipe } from '../components/feedback/PMToaster/PMToaster.recipe';
import { pmCheckboxCard } from '../components/form/PMCheckboxCard/PMCheckboxCard.recipe';
import { pmSegmentedControl } from '../components/form/PMSegmentedControl/PMSegmentedControl.recipe';
import { pmRadioGroup } from '../components/form/PMRadioGroup/PMRadioGroup.recipe';
import { pmSelectRecipe } from '../components/form/PMSelect/PMSelect.recipe';
import { pmRadioCard } from '../components/form/PMRadioCard/PMRadioCard.recipe';
import { pmTreeViewRecipe } from '../components/navigation/PMTreeView/PMTreeView.recipe';
import { pmDialogRecipe } from '../components/form/PMDialog/PMDialog.recipe';
export const packmindTheme = (preflight: boolean) =>
  defineConfig({
    preflight,
    globalCss: {
      'html, body': {
        margin: 0,
        padding: 0,
        fontSize: '16px',
        fontFamily: "'Borna', sans-serif",
        backgroundColor: '{colors.background.secondary}',
        color: '{colors.text.primary}',
      },
      '::selection': {
        background: '{colors.blue.500}',
        color: '{colors.beige.0}',
        textShadow: 'none',
      },

      '::-moz-selection': {
        background: '{colors.blue.500}',
        color: '{colors.beige.0}',
        textShadow: 'none',
      },
    },
    cssVarsPrefix: 'pm',
    theme: {
      tokens: {
        colors: {
          beige: {
            0: { value: 'var(--Palette-Neutral-Beige0)' },
            50: { value: 'var(--Palette-Neutral-Beige50)' },
            100: { value: 'var(--Palette-Neutral-Beige100)' },
            200: { value: 'var(--Palette-Neutral-Beige200)' },
            300: { value: 'var(--Palette-Neutral-Beige300)' },
            400: { value: 'var(--Palette-Neutral-Beige400)' },
            500: { value: 'var(--Palette-Neutral-Beige500)' },
            600: { value: 'var(--Palette-Neutral-Beige600)' },
            700: { value: 'var(--Palette-Neutral-Beige700)' },
            800: { value: 'var(--Palette-Neutral-Beige800)' },
            900: { value: 'var(--Palette-Neutral-Beige900)' },
            1000: { value: 'var(--Palette-Neutral-Beige1000)' },
          },
          blue: {
            0: { value: 'var(--Palette-Brand-Blue0)' },
            100: { value: 'var(--Palette-Brand-Blue100)' },
            200: { value: 'var(--Palette-Brand-Blue200)' },
            300: { value: 'var(--Palette-Brand-Blue300)' },
            400: { value: 'var(--Palette-Brand-Blue400)' },
            500: { value: 'var(--Palette-Brand-Blue500)' },
            600: { value: 'var(--Palette-Brand-Blue600)' },
            700: { value: 'var(--Palette-Brand-Blue700)' },
            800: { value: 'var(--Palette-Brand-Blue800)' },
            900: { value: 'var(--Palette-Brand-Blue900)' },
            1000: { value: 'var(--Palette-Brand-Blue1000)' },
          },
          orange: {
            0: { value: 'var(--Palette-Brand-Orange0)' },
            100: { value: 'var(--Palette-Brand-Orange100)' },
            200: { value: 'var(--Palette-Brand-Orange200)' },
            300: { value: 'var(--Palette-Brand-Orange300)' },
            400: { value: 'var(--Palette-Brand-Orange400)' },
            500: { value: 'var(--Palette-Brand-Orange500)' },
            600: { value: 'var(--Palette-Brand-Orange600)' },
            700: { value: 'var(--Palette-Brand-Orange700)' },
            800: { value: 'var(--Palette-Brand-Orange800)' },
            900: { value: 'var(--Palette-Brand-Orange900)' },
            1000: { value: 'var(--Palette-Brand-Orange1000)' },
          },
          green: {
            0: { value: 'var(--Palette-Semantic-Green0)' },
            100: { value: 'var(--Palette-Semantic-Green100)' },
            200: { value: 'var(--Palette-Semantic-Green200)' },
            300: { value: 'var(--Palette-Semantic-Green300)' },
            400: { value: 'var(--Palette-Semantic-Green400)' },
            500: { value: 'var(--Palette-Semantic-Green500)' },
            600: { value: 'var(--Palette-Semantic-Green600)' },
            700: { value: 'var(--Palette-Semantic-Green700)' },
            800: { value: 'var(--Palette-Semantic-Green800)' },
            900: { value: 'var(--Palette-Semantic-Green900)' },
            1000: { value: 'var(--Palette-Semantic-Green1000)' },
          },
          red: {
            0: { value: 'var(--Palette-Semantic-Red0)' },
            100: { value: 'var(--Palette-Semantic-Red100)' },
            200: { value: 'var(--Palette-Semantic-Red200)' },
            300: { value: 'var(--Palette-Semantic-Red300)' },
            400: { value: 'var(--Palette-Semantic-Red400)' },
            500: { value: 'var(--Palette-Semantic-Red500)' },
            600: { value: 'var(--Palette-Semantic-Red600)' },
            700: { value: 'var(--Palette-Semantic-Red700)' },
            800: { value: 'var(--Palette-Semantic-Red800)' },
            900: { value: 'var(--Palette-Semantic-Red900)' },
            1000: { value: 'var(--Palette-Semantic-Red1000)' },
          },
          yellow: {
            0: { value: 'var(--Palette-Semantic-Yellow0)' },
            100: { value: 'var(--Palette-Semantic-Yellow100)' },
            200: { value: 'var(--Palette-Semantic-Yellow200)' },
            300: { value: 'var(--Palette-Semantic-Yellow300)' },
            400: { value: 'var(--Palette-Semantic-Yellow400)' },
            500: { value: 'var(--Palette-Semantic-Yellow500)' },
            600: { value: 'var(--Palette-Semantic-Yellow600)' },
            700: { value: 'var(--Palette-Semantic-Yellow700)' },
            800: { value: 'var(--Palette-Semantic-Yellow800)' },
            900: { value: 'var(--Palette-Semantic-Yellow900)' },
            1000: { value: 'var(--Palette-Semantic-Yellow1000)' },
          },
          purple: {
            0: { value: 'var(--Palette-Others-Purple0)' },
            100: { value: 'var(--Palette-Others-Purple100)' },
            200: { value: 'var(--Palette-Others-Purple200)' },
            300: { value: 'var(--Palette-Others-Purple300)' },
            400: { value: 'var(--Palette-Others-Purple400)' },
            500: { value: 'var(--Palette-Others-Purple500)' },
            600: { value: 'var(--Palette-Others-Purple600)' },
            700: { value: 'var(--Palette-Others-Purple700)' },
            800: { value: 'var(--Palette-Others-Purple800)' },
            900: { value: 'var(--Palette-Others-Purple900)' },
            1000: { value: 'var(--Palette-Others-Purple1000)' },
          },
        },
        fonts: {
          body: { value: 'Borna, sans-serif' },
          heading: { value: 'Borna, sans-serif' },
        },
        fontSizes: {
          xs: { value: '0.8125rem' },
          sm: { value: '0.875rem' },
          md: { value: '0.9375rem' },
          lg: { value: '1rem' },
          xl: { value: '1.125rem' },
          '2xl': { value: '1.25rem' },
          '3xl': { value: '1.5rem' },
          '4xl': { value: '2rem' },
        },
      },
      recipes: {
        heading: pmHeadingRecipe,
        text: pmTextRecipe,
        button: pmButtonRecipe,
        link: pmLinkRecipe,
      },
      slotRecipes: {
        table: pmTableRecipe,
        menu: pmMenuRecipe,
        tabs: pmTabsRecipe,
        timeline: pmTimelineRecipe,
        combobox: pmComboboxRecipe,
        toast: pmToasterRecipe,
        checkboxCard: pmCheckboxCard,
        segmentGroup: pmSegmentedControl,
        radioGroup: pmRadioGroup,
        select: pmSelectRecipe,
        radioCard: pmRadioCard,
        treeView: pmTreeViewRecipe,
        dialog: pmDialogRecipe,
      },
      semanticTokens: {
        colors: {
          blue: {
            subtle: { value: '{colors.blue.800}' },
            fg: { value: '{colors.blue.100}' },
            muted: { value: '{colors.blue.600}' },
          },
          green: {
            subtle: { value: '{colors.green.800}' },
            fg: { value: '{colors.green.100}' },
            muted: { value: '{colors.green.600}' },
          },
          orange: {
            subtle: { value: '{colors.orange.800}' },
            fg: { value: '{colors.orange.100}' },
            muted: { value: '{colors.orange.600}' },
          },
          red: {
            subtle: { value: '{colors.red.800}' },
            fg: { value: '{colors.red.100}' },
            muted: { value: '{colors.red.600}' },
          },
          purple: {
            subtle: { value: '{colors.purple.800}' },
            fg: { value: '{colors.purple.100}' },
            muted: { value: '{colors.purple.600}' },
          },
          gray: {
            subtle: { value: '{colors.beige.800}' },
            fg: { value: '{colors.beige.200}' },
            muted: { value: '{colors.yellow.600}' },
          },
          yellow: {
            subtle: { value: '{colors.yellow.800}' },
            fg: { value: '{colors.yellow.100}' },
            muted: { value: '{colors.yellow.600}' },
          },
          pink: {
            subtle: { value: '{colors.pink.800}' },
            fg: { value: '{colors.pink.100}' },
            muted: { value: '{colors.pink.600}' },
          },
          branding: {
            primary: { value: '{colors.blue.200}' },
          },
          bg: {
            panel: { value: '{colors.beige.1000}' },
          },
          fg: {
            DEFAULT: { value: '{colors.beige.0}' },
            muted: { value: '{colors.text.faded}' },
          },
          background: {
            primary: { value: '{colors.beige.1000}' },
            secondary: { value: '{colors.beige.900}' },
            tertiary: { value: '{colors.beige.800}' },
            faded: { value: '{colors.beige.700}' },
          },
          text: {
            primary: { value: '{colors.beige.0}' },
            secondary: { value: '{colors.beige.100}' },
            tertiary: { value: '{colors.beige.300}' },
            faded: { value: '{colors.beige.500}' },
            error: { value: '{colors.red.500}' },
            warning: { value: '{colors.orange.500}' },
            success: { value: '{colors.green.500}' },
            primaryLight: { value: '{colors.beige.900}' },
            secondaryLight: { value: '{colors.beige.700}' },
            tertiaryLight: { value: '{colors.beige.500}' },
          },
          border: {
            DEFAULT: { value: '{colors.beige.1000}' },
            primary: { value: '{colors.beige.1000}' },
            secondary: { value: '{colors.beige.900}' },
            tertiary: { value: '{colors.beige.800}' },
            checkbox: { value: '{colors.beige.700}' },
          },
        },
      },
    },
  });

export const packmindDesignSystemFactory = (preflight: boolean) =>
  createSystem(defaultConfig, packmindTheme(preflight));

export default packmindDesignSystemFactory(true);
