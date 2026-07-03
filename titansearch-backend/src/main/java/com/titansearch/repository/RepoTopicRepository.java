package com.titansearch.repository;

import com.titansearch.entity.RepoTopic;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepoTopicRepository extends JpaRepository<RepoTopic, Long> {
}
