module.exports = {
    config: {
        port: 3000,
        address: "http://localhost",
        editor: null,
        dirPath: './.learn',
        configPath: './learn.json',
        outputPath: './.learn/dist',
        publicPath: '/preview',
        grading: 'isolated', // [isolated, incremental]
        exercisesPath: './exercises', // path to the folder that contains the exercises
        webpackTemplate: null, // if you want webpack to use an HTML template
        disableGrading: false,
        actions: ['build', 'test', 'reset'] //this should be empty by default, but I'm testing
    },
    entries: {
        html: "index.html",
        vanillajs: "index.js",
        react: "app.jsx",
        node: "app.js",
        python3: "app.py",
        java: "app.java",
    }
}