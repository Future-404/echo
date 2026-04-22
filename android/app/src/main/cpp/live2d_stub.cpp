// Stub for ABIs without Live2D native library
// All JNI methods are no-ops; nativeIsStub() returns true so Java can detect this.
#include <jni.h>

extern "C" {

JNIEXPORT jboolean JNICALL
Java_com_echo_app_Live2DRenderer_nativeIsStub(JNIEnv*, jclass) { return JNI_TRUE; }

JNIEXPORT void JNICALL
Java_com_echo_app_Live2DRenderer_nativeInit(JNIEnv*, jobject, jobject) {}

JNIEXPORT void JNICALL
Java_com_echo_app_Live2DRenderer_nativeLoadModel(JNIEnv*, jobject, jobject, jstring) {}

JNIEXPORT void JNICALL
Java_com_echo_app_Live2DRenderer_nativeStartMotion(JNIEnv*, jobject, jstring, jint, jint) {}

JNIEXPORT void JNICALL
Java_com_echo_app_Live2DRenderer_nativeSetExpression(JNIEnv*, jobject, jstring) {}

JNIEXPORT void JNICALL
Java_com_echo_app_Live2DRenderer_nativeSetParameterValue(JNIEnv*, jobject, jstring, jfloat) {}

JNIEXPORT void JNICALL
Java_com_echo_app_Live2DRenderer_nativeOnDrawFrame(JNIEnv*, jobject) {}

JNIEXPORT void JNICALL
Java_com_echo_app_Live2DRenderer_nativeOnSurfaceChanged(JNIEnv*, jobject, jint, jint) {}

JNIEXPORT void JNICALL
Java_com_echo_app_Live2DRenderer_nativeSetModelTransform(JNIEnv*, jobject, jfloat, jfloat, jfloat) {}

} // extern "C"
