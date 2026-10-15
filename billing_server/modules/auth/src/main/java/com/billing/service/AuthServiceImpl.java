package com.billing.service;

import com.billing.core.license.LicenseValidator;
import com.billing.core.response.ResponseDO;
import com.billing.domain.User;
import com.billing.dtos.UserDTO;
import com.billing.model.AuthModel;
import com.billing.repository.CustomUserRepository;
import com.billing.repository.UserRepository;
import com.billing.utils.AccessTokenUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AuthServiceImpl implements AuthService {

    private final CustomUserRepository usersRepository;
    private final UserRepository userRepository;
    private final AccessTokenUtils accessTokenUtils;
    private final LicenseValidator licenseValidator;

    public AuthServiceImpl(
            CustomUserRepository usersRepository,
            UserRepository userRepository,
            AccessTokenUtils accessTokenUtils,
            @Autowired(required = false) LicenseValidator licenseValidator
    ) {
        this.usersRepository = usersRepository;
        this.userRepository = userRepository;
        this.accessTokenUtils = accessTokenUtils;
        this.licenseValidator = licenseValidator;
    }

    @Override
    public Optional<User> fetchById(Long userId) {
        return this.userRepository.findById(userId);
    }

    @Override
    public List<Long> moduleIds(Long userId) {
        if (userId == null) {
            return List.of();
        }
        return this.userRepository.findModuleIdsByUserId(userId).stream()
                .map(Number::longValue)
                .toList();
    }

    @Override
    public ResponseDO doLogin(AuthModel authModel) {
        if (licenseValidator != null) {
            licenseValidator.validateForLogin();
        }
        User user = this.usersRepository.login(authModel.getUserName(), authModel.getPassword());
        UserDTO userDTO = user.to();
        userDTO.setModuleIds(moduleIds(user.getId()));
        userDTO.setAccessToken(accessTokenUtils.generateAccessToken(user.getId()));
        ResponseDO responseDO = new ResponseDO();
        responseDO.setSuccess(true);
        responseDO.setData(userDTO);
        return responseDO;
    }
}
