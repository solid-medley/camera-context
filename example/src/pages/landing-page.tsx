import { Component } from 'solid-js';
import { TestButton } from '../components/test-button';
import { TestVideo } from '../components/test-video';

export const LandingPage: Component = () => {

	return <>
		<h2>Main page!</h2>
		<p>TODO Work in progress</p>
		<TestButton />
		<TestVideo />
	</>
}