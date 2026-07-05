package com.engram.service;

import com.engram.model.Tag;
import com.engram.repository.TagRepository;
import com.engram.web.dto.CreateTagRequest;
import com.engram.web.dto.TagResponse;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TagService {

    private final TagRepository tagRepository;

    public TagService(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    @Transactional
    public Tag getOrCreate(String rawName) {
        String name = rawName.trim();
        return tagRepository.findByName(name).orElseGet(() -> {
            Tag tag = new Tag();
            tag.setName(name);
            return tagRepository.save(tag);
        });
    }

    @Transactional
    public Set<Tag> resolve(Collection<String> names) {
        Set<Tag> tags = new LinkedHashSet<>();
        if (names == null) {
            return tags;
        }
        for (String name : names) {
            if (name != null && !name.isBlank()) {
                tags.add(getOrCreate(name));
            }
        }
        return tags;
    }

    @Transactional(readOnly = true)
    public List<TagResponse> list() {
        return tagRepository.findAll().stream()
                .map(tag -> new TagResponse(tag.getId(), tag.getName()))
                .toList();
    }

    @Transactional
    public TagResponse create(CreateTagRequest request) {
        Tag tag = getOrCreate(request.name());
        return new TagResponse(tag.getId(), tag.getName());
    }
}
