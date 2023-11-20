# Clone latest main of app at runtime. This ensures the tests always run with the latest version of the app.
# You can check out a different branch here and re-run the tests if you want to test against a specific branch of the app.
git clone https://github.com/drips-network/app.git

npm run ci
npm run

cd app

npm run build:graphql
npm run build

VITE_TEST_MODE=true npm run build

npm run test:e2e
