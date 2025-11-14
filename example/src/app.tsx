
import { RouteSectionProps } from '@solidjs/router'
import { children, Component } from 'solid-js'

import './app.css'

export const AppRoot: Component<RouteSectionProps> = (props) => <div>
        <h1>@solid-medley/camera-context</h1>
        {children(() => props.children)()}
</div>