cmake_minimum_required(VERSION 3.22.1)
project("live2d_native")

set(LIVE2D_SDK_DIR ${CMAKE_CURRENT_SOURCE_DIR}/live2d)
set(LIVE2D_LIB ${LIVE2D_SDK_DIR}/lib/android/${ANDROID_ABI}/libLive2DCubismCore.a)

# 只在有静态库的 ABI 上启用 Live2D
if(EXISTS ${LIVE2D_LIB})
    include_directories(
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${LIVE2D_SDK_DIR}/include
    )

    add_library(live2d_core STATIC IMPORTED)
    set_target_properties(live2d_core PROPERTIES IMPORTED_LOCATION ${LIVE2D_LIB})

    add_library(live2d_native SHARED
        live2d_native.cpp
        stb_impl.c
    )

    target_link_libraries(live2d_native
        live2d_core
        GLESv2
        log
        android
    )
else()
    # 无静态库时构建空 stub，避免编译失败
    add_library(live2d_native SHARED live2d_stub.cpp)
    target_link_libraries(live2d_native log)
endif()
