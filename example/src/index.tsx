/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route } from '@solidjs/router'
import { routeBase, PagesReRouter } from '@quick-vite/gh-pages-spa/solidjs'

import { AppRoot } from './app'
import { LandingPage } from './pages/landing-page'
import { NotFoundPage } from './pages/404'

export const routes = () => <Router base={routeBase()} root={AppRoot}>
	<PagesReRouter>
		<Route path="/" component={LandingPage} />
		<Route path="*404" component={NotFoundPage} />
	</PagesReRouter>
</Router>

// Apparently this is necessary because srcdocced iframes load the currentwindow
const root = document.getElementById('root');
if (root) render(routes, root)