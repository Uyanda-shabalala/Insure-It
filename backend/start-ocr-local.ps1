# Run from backend/. Requires Java 17+ and Maven on PATH.
$env:OCR_FALLBACK_ENABLED = 'true'
mvn -Pocr-only spring-boot:run '-Dspring-boot.run.profiles=local' '-Dspring-boot.run.arguments=--spring.config.import=classpath:application-ocr-only.properties'
