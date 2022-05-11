import { ProviderInfo } from '../../models';
import { APP } from '../../variables';

export const providerInfo: ProviderInfo = {
  SteamGridDB: {
    info: APP.lang.sgdbProvider.docs__md.self.join(''),
    inputs: {
      nsfw: {
        label: APP.lang.sgdbProvider.nsfwInputTitle,
        inputType: 'toggle',
        info: APP.lang.sgdbProvider.docs__md.input.join('')
      },
      humor: {
        label: APP.lang.sgdbProvider.humorInputTitle,
        inputType: 'toggle',
        info: APP.lang.sgdbProvider.docs__md.input.join('')
      },
      styles: {
        label: APP.lang.sgdbProvider.stylesTitle,
        inputType: 'multiselect',
        allowedValues: ['alternate', 'blurred', 'white_logo', 'material', 'no_logo'],
        multiple: true,
        allowEmpty: true,
        info: APP.lang.sgdbProvider.docs__md.input.join('')
      },
      stylesHero: {
        label: APP.lang.sgdbProvider.stylesHeroTitle,
        inputType: 'multiselect',
        allowedValues: ['alternate', 'blurred', 'material'],
        multiple: true,
        allowEmpty: true,
        info: APP.lang.sgdbProvider.docs__md.input.join('')
      },
      stylesLogo: {
        label: APP.lang.sgdbProvider.stylesLogoTitle,
        inputType: 'multiselect',
        allowedValues: ['official', 'white', 'black', 'custom'],
        multiple: true,
        allowEmpty: true,
        info: APP.lang.sgdbProvider.docs__md.input.join('')
      },
      stylesIcon: {
        label: APP.lang.sgdbProvider.stylesIconTitle,
        inputType: 'multiselect',
        allowedValues: ['official','custom'],
        multiple: true,
        allowEmpty: true,
        info: APP.lang.sgdbProvider.docs__md.input.join('')
      },
      imageMotionTypes: {
        label: APP.lang.sgdbProvider.imageMotionTypesTitle,
        inputType: 'multiselect',
        allowedValues: ['static', 'animated'],
        multiple: true,
        allowEmpty: false,
        info: APP.lang.sgdbProvider.docs__md.input.join('')
      }
    }
  }
};

export const availableProviders = Object.keys(providerInfo);

export const defaultProviders = ['SteamGridDB'];
