package com.engram.config;

import org.hibernate.community.dialect.SQLiteDialect;
import org.springframework.aot.hint.MemberCategory;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;

/**
 * Reachability hints for GraalVM native image. The community SQLite dialect is
 * loaded reflectively by Hibernate, and Liquibase changelog files must be kept
 * as resources. This is a starting point; a native build may need further hints
 * once actually compiled on a GraalVM toolchain.
 */
public class NativeHints implements RuntimeHintsRegistrar {

    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
        hints.reflection().registerType(
                SQLiteDialect.class,
                MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
                MemberCategory.INVOKE_PUBLIC_METHODS);
        hints.resources().registerPattern("db/changelog/*");
        hints.resources().registerPattern("db/changelog/changes/*");
    }
}
