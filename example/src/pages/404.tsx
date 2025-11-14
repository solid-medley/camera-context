import { Component } from "solid-js";

export const NotFoundPage: Component = () => <>
	<h2>Not found!</h2>
	<p>Page not found <a href={import.meta.env.BASE_URL}>Back to the main page</a>.</p>
</>