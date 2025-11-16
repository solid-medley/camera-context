
import { RouteSectionProps } from '@solidjs/router'
import { children, Component } from 'solid-js'

import './app.css'
import { CameraContextProvider } from '../../lib/src/camera-context';

export const AppRoot: Component<RouteSectionProps> = (props) => <div>
        <CameraContextProvider appName='camera-context-example'>
                <h1>@solid-medley/camera-context</h1>
                {children(() => props.children)()}
        </CameraContextProvider>
</div>