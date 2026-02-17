declare module '@expo/vector-icons' {
  import { ComponentProps } from 'react';
  import { TextStyle } from 'react-native';

  interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: TextStyle;
  }

  export const MaterialCommunityIcons: React.FC<IconProps>;
  export const Ionicons: React.FC<IconProps>;
  export const FontAwesome: React.FC<IconProps>;
  export const FontAwesome5: React.FC<IconProps>;
  export const MaterialIcons: React.FC<IconProps>;
  export const Feather: React.FC<IconProps>;
  export const AntDesign: React.FC<IconProps>;
  export const Entypo: React.FC<IconProps>;
}
