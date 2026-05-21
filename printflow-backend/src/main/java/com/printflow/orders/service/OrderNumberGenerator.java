package com.printflow.orders.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Year;

@Component
public class OrderNumberGenerator {

    private final JdbcTemplate jdbcTemplate;

    public OrderNumberGenerator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public String generate() {
        Long seq = jdbcTemplate.queryForObject(
            "SELECT nextval('order_number_seq')", Long.class);
        return String.format("PF-%d-%05d", Year.now().getValue(), seq);
    }
}
