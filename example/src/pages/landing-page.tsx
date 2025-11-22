import { Component } from 'solid-js';
import { TestVideo } from '../components/test-video';
import { TestButton } from '../components/test-button';
import { DebugInfo } from '../components/debug-info';

export const LandingPage: Component = () => {

	return <>
		<h2>Main page!</h2>
		<p>TODO Work in progress</p>
		<TestButton />
		<TestVideo />
		<DebugInfo />
	</>
}