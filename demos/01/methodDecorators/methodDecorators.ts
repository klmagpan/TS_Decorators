// tsc methodDecorators.ts && node methodDecorators.js
// node methodDecorators.js
function log(target, context) {
	return function (this, ...args) {
		console.log(`Calling method at ${new Date().toISOString()}`)
		const result = target.apply(this, args)
		console.log(`Method finished at ${new Date().toISOString()}`)
		return result
	}
}

class GithubClient {
	@log
	public getRepos() {
		console.log('Getting Github repos...')
	}
}

new GithubClient().getRepos()
