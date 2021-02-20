# tskod

keystore alias is "debug"
Password is in Ojan's OnePassword.

https://www.npmjs.com/package/googleapis

## To create Android debug APK that doesn't need the metro server:

mkdir android/app/src/main/assets

npx react-native start &

npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res &

curl "http://localhost:8081/index.bundle?platform=android" -o "android/app/src/main/assets/index.android.bundle"

cd android
./gradlew clean assembleDebug
adb install ./app/build/outputs/apk/debug/app-debug.apk
