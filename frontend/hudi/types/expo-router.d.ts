declare module 'expo-router' {
  import { ComponentType, ReactNode } from 'react';

  export function useRouter(): {
    push: (href: string | { pathname: string; params?: Record<string, any> }) => void;
    replace: (href: string | { pathname: string; params?: Record<string, any> }) => void;
    back: () => void;
    canGoBack: () => boolean;
  };

  export function useLocalSearchParams<T = Record<string, string>>(): T;

  export type Href = string;

  export const Stack: ComponentType<{
    children?: ReactNode;
    screenOptions?: any;
  }> & {
    Screen: ComponentType<{
      name: string;
      options?: {
        headerShown?: boolean;
        title?: string;
      };
    }>;
  };

  export const Tabs: ComponentType<{
    children?: ReactNode;
    screenOptions?: any;
  }> & {
    Screen: ComponentType<{
      name: string;
      options?: {
        title?: string;
        tabBarIcon?: (props: { focused: boolean; color: string }) => React.ReactNode;
        headerShown?: boolean;
      };
    }>;
  };

  export const Link: ComponentType<{
    href: string;
    children: React.ReactNode;
    style?: any;
    onPress?: (e: any) => void;
    target?: string;
  }>;

  export type RelativePathString = string;
  export type ExternalPathString = string;
  export type UnknownInputParams = Record<string, any>;
  export type UnknownOutputParams = Record<string, any>;
}