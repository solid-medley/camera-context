
import { RouteSectionProps } from '@solidjs/router'
import { children, Component } from 'solid-js'
import { CameraContextProvider } from '@solid-medley/camera-context';

import './app.css'

export const AppRoot: Component<RouteSectionProps> = (props) => <div>
        <CameraContextProvider appName='camera-context-example'>
                <h1>@solid-medley/camera-context</h1>
                {children(() => props.children)()}
        </CameraContextProvider>
</div>