package com.insureit;

import com.insureit.models.*;
import com.insureit.repositories.*;
import com.sun.net.httpserver.HttpServer;
import org.springframework.boot.SpringApplication;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

/** Isolated browser QA: real Spring/JPA/H2 with a local stand-in for Groq. Never uses Supabase. */
public class IntegrationPreview {
    public static void main(String[] args) throws Exception {
        var provider = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        provider.createContext("/groq", exchange -> {
            exchange.getRequestBody().readAllBytes();
            byte[] body = "{\"choices\":[{\"message\":{\"content\":\"{\\\"serialNumber\\\":\\\"QA-OCR-123\\\",\\\"status\\\":\\\"FOUND\\\"}\"}}]}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            try (var output = exchange.getResponseBody()) { output.write(body); }
        });
        provider.start();
        var context = SpringApplication.run(InsureItApplication.class,
                "--spring.profiles.active=local", "--spring.config.import=classpath:application-test.properties",
                "--spring.datasource.url=jdbc:h2:mem:insureit-browser;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
                "--server.port=8088", "--groq.api.url=http://127.0.0.1:" + provider.getAddress().getPort() + "/groq");
        Runtime.getRuntime().addShutdownHook(new Thread(() -> { context.close(); provider.stop(0); }));
        context.getBean(org.springframework.jdbc.core.JdbcTemplate.class).execute("create table insurance_providers (id uuid primary key, name varchar(120) not null, phone_number varchar(30))");
        Brand brand = new Brand(); brand.setName("Dell"); context.getBean(BrandRepo.class).save(brand);
        DeviceType type = new DeviceType(); type.setName("Laptop"); context.getBean(DeviceTypeRepo.class).save(type);
        if (!Boolean.getBoolean("preview.emptyEmployees")) {
        Employee employee = new Employee(); employee.setEmployeeNumber("QA001"); employee.setFullName("QA Employee");
        employee.setDepartment("IT"); context.getBean(EmployeeRepo.class).save(employee);
        }
        System.out.println("INTEGRATION_PREVIEW_READY: temporary H2 database and simulated OCR provider");
    }
}
