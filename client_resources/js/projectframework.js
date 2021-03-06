/*
    Insight project framework

    Framework for implementing Insight projects

    (c) Copyright 2020 Fair Isaac Corporation
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/* global insight   */
/* global $         */
/* global _         */
/* global ko        */

ProjectFramework.prototype = {
    /*
    PUBLIC INTERFACE
    */
    currentProjectFolders: ko.observableArray([]),
    newProjectName: ko.observable(),
    showLoadingOverlay: ko.observable(),
    shelfValid: ko.observable(false),
    shelfValidationMessage: ko.observable(),
    projectRevisionMessage: ko.observable(),

    // initialize the framework
    init: function() {
        var self = this;
        self._init();
    },

    // Create a new project and open it
    createProject: function createProject(newProjectName) {
        var self = this;
        var newScenario;

        newProjectName = newProjectName.trim();
        if (!self._validateProjectName(newProjectName)) {
            self.view.showErrorMessage('\"' + newProjectName + '\" is not a valid name for a project.');
            return Promise.reject();
        }

        if (self._deBounceNewProjectButton(newProjectName))
        // double click, ignore
            return Promise.reject();

        return self.app.createFolder(self.app._data, newProjectName)
            .then(function (folder) {
                return self.app.createScenario(folder, folder.displayName, self.config.projectScenarioType);
            })
            .then(function (scenario) {
                newScenario = scenario;
                return self.view.executeScenario(scenario.id, insight.enums.ExecutionType.LOAD, {suppressClearPrompt: true});
            })
            .then(function () {
                return self._moveToProject(newScenario);
            })
            .catch(function (error) {
                console.log("createProject: " + error);
                self.view.showErrorMessage('Failed to create project');
                return Promise.reject();
            });
    },

    // Open existing project
    openProject: function openProject(projectFolderId) {
        var self = this;

        return self._getProjectScenarioForFolder(projectFolderId)
            .then(function (projectScenario) {
                return self._moveToProject(projectScenario);
            })
            .catch(function () {
                var projectFolder = self._getProjectFolderObject(projectFolderId);
                self.view.showErrorMessage('Failed to open project "' + projectFolder.displayName + '".');
                return Promise.reject();
            });
    },

    // refresh the list of projects
    refreshProjectList: function () {
        var self = this;
        self._getProjects();
    },

    // Rename project
    renameProject: function (projectFolderId) {
        var self = this;

        var projectFolder = self._getProjectFolderObject(projectFolderId);
        self.dom.showConfirmationDialog(
            "rename",
            "Rename Project",
            "",
            "",
            self._handleRenameConfirmation.bind(self, projectFolderId),
            projectFolder.displayName
        );
    },

    // Delete project
    deleteProject: function (projectFolderId) {
        var self = this;
        self.dom.showConfirmationDialog(
            "delete",
            "Delete Project",
            "Are you sure you wish to delete this project?",
            "This operation cannot be undone.",
            self._deleteProject.bind(self, projectFolderId)
        );
    },

    // Clone project
    cloneProject: function (projectFolderId) {
        var self = this;
        var projectFolder = self._getProjectFolderObject(projectFolderId);

        self.dom.showConfirmationDialog(
            "clone",
            "Clone Project",
            "",
            'Clone Project will clone the project settings only. If you wish to clone your scenarios as well, export the project and then re-import it.',
            self._handleCloneConfirmation.bind(self, projectFolderId),
            projectFolder.displayName
        );
    },

    // Export project
    exportProject: function (projectFolderId) {
        var self = this;
        self.dom.showConfirmationDialog(
            "export",
            "Export Project",
            "Are you sure you wish to export this project?",
            'This action will export the project settings and all scenarios.',
            self._exportProject.bind(self, projectFolderId));
    },

    // Import project
    importProject: function (newProjectName) {
        var self = this;

        newProjectName = newProjectName.trim();
        if (!this._validateProjectName(newProjectName)) {
            self.view.showErrorMessage('\"' + newProjectName + '\" is not a valid name for a project.');
            return Promise.reject();
        }
        return self._importProject(newProjectName);
    },

    // Check the shelf is properly configured with project [ and optionally scenarios]
    validateShelf: function (pagetype, scenarios) {
        var self = this;
        var response = {};

        switch (pagetype) {
            case 'scenario':
                response = self._validateForScenarioPage(scenarios);
                break;
            case 'project':
                response = self._validateForProjectPage(scenarios);
                break;
            default:
                response.valid = true;
                // no validation for now
                break;
        }
        return response;
    },

    shareProject: function (projectFolderId) {
        var self = this;

        var projectFolder = self._getProjectFolderObject(projectFolderId);

        return self._getProjectScenarioForFolder(projectFolderId)
            .then(function (projectScenario) {
                // possible share combinations
                var folderTargetShare = projectFolder.shareStatus;
                var projectTargetShare = projectScenario.shareStatus;
                var currentShare = "";

                if (folderTargetShare == "PRIVATE" && projectTargetShare == "PRIVATE")
                    currentShare = "SHARE_PRIVATE";
                else if (folderTargetShare == "READONLY" && projectTargetShare == "READONLY")
                    currentShare = "SHARE_READONLY";
                else if (folderTargetShare == "FULLACCESS" && projectTargetShare == "READONLY")
                    currentShare = "SHARE_PROJECTREADONLY";
                else if (folderTargetShare == "FULLACCESS" && projectTargetShare == "FULLACCESS")
                    currentShare = "SHARE_FULL";
                else
                    currentShare = "SHARE_UNRECOGNISED";

                self.dom.showConfirmationDialog(
                    "share",
                    "Share Project",
                    "",
                    "",
                    self._handleShareConfirmation.bind(self, projectFolderId),
                    currentShare
                    );
            });
    },
    goToManageView: function() {
        var self=this;
        insight.openView(self.config.manageView);
    },

    /*
    PRIVATE
    */
    BASE_REST_ENDPOINT: '/insightservices/rest/v1/data/',
    deBounceNewProjectNames: [],
    projectRevision: 0,

    _restRequest: function (path, type, data, dataType) {
        var self = this;
        var request = {
            url: insight.resolveRestEndpoint(self.BASE_REST_ENDPOINT + path),
            type: type,
            data: data,
            dataType: dataType === undefined ? 'JSON' : dataType,
            contentType: 'application/json; charset=utf-8'
        };

        return new Promise(function (resolve, reject) {
            var jqXHR = $.ajax(request);

            jqXHR.done(function (data, textStatus, jqXHR) {
                resolve(data);
            });

            jqXHR.fail(function (data, textStatus, jqXHR) {
                console.log("--- failed request");
                console.log(data);
                console.log(textStatus);
                console.log(jqXHR);
                reject(textStatus);
            });
        });
    },
    _getProjects: function () {
        var self = this;

        return self._restRequest('project/' + self.appId + '/children?maxResults=9999', 'GET')
            .then(function (json) {
                var folders = [];

                for(var i=0;i<json.items.length;i++) {
                    var item = json.items[i];
                    // needs to be a folder
                    // mask out those starting with underscore
                    if (item.objectType === 'FOLDER' && !item.displayName.indexOf("_") == 0) {
                        folders.push(item);
                    }
                };

                // sort case insensitive
                folders.sort(function (a, b) {
                    return a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase());
                });

                return self.app.getUsers()
                    .then(function(response) {
                        var users={};
                        for(var i=0;i<response.length;i++)
                            users[response[i]._data.username] = response[i]._data.displayName;

                        for(var i=0;i<folders.length;i++)
                            folders[i].ownerDisplayName = users[folders[i].ownerId];

                        // flush the existing list
                        self.currentProjectFolders([]);
                        return self.currentProjectFolders(folders);
                    });
            })
            .catch(function () {
                self.view.showErrorMessage('Unexpected error fetching projects list');
            });
    },
    _moveToProject: function (projectScenario) {
        var self = this;

        self.view.setShelf([projectScenario.id]);
        insight.openView(this.config.defaultView);
    },
    _getProjectScenarioForFolder: function (folderId) {
        var self = this;

        if (!folderId) {
            console.log("Internal error: undefined argument to _getProjectScenarioForFolder");
            self.view.showErrorMessage('This doesn\'t look like a project folder.');
            return Promise.reject();
        }

        return self._restRequest('folder/' + folderId + '/children?maxResults=9999', 'GET')
            .then(function (json) {
                var found;
                for(var i=0; i<json.items.length;i++)
                    if (json.items[i].scenarioType == self.config.projectScenarioType)
                        found=json.items[i];
                if (found)
                    return found;
                else
                    throw new Error;
            }).catch(function () {
                self.view.showErrorMessage('This doesn\'t look like a project folder.');
                return Promise.reject();
            });
    },
    _validateProjectName: function (newProjectName) {
        return !(!newProjectName || newProjectName.indexOf("_") == 0);
    },
    _getProjectFolderObject: function (projectFolderId) {
        var self = this;
        var projectFolders = this.currentProjectFolders();

        var folderIndex;
        for (var i=0; i<projectFolders.length;i++)
            if (projectFolders[i].id === projectFolderId)
                folderIndex = i;

        return projectFolders[folderIndex];
    },
    _handleCloneConfirmation: function (projectFolderId, event) {
        var self = this;

        var modal = $(event.target).parents('.modal');
        var newName = modal.find('.dialogValue').val();

        self._cloneFolderAndProjectScenario(projectFolderId, newName);
    },
    _cloneFolderAndProjectScenario: function (projectFolderId, newName) {
        var self = this;

        if (!self._validateProjectName(newName)) {
            self.view.showErrorMessage('\"' + newName + '\" is not a valid name for a project.');
            return Promise.reject();
        }

        var projectFolder = self._getProjectFolderObject(projectFolderId);
        var actualNewName;
        var newFolder;
        // attempt to create the folder with name newName
        return self.app.createFolder(self.app._data, newName)
            .then(function (folder) {
                // name may have been decorated
                actualNewName = folder.displayName;
                newFolder = folder;
                return self._getProjectScenarioForFolder(projectFolderId)
            })
            // copy the project scenario into the new folder as the new actual name
            .then(function (projectScenario) {
                return self._cloneScenario(projectScenario.id, newFolder, actualNewName);
            })
            // all good
            .then(function (scenario) {
                var successMessage = '';

                if (actualNewName !== newName) {
                    successMessage = 'Project "' + projectFolder.displayName + '" was successfully cloned and named "' + actualNewName + '" to avoid a naming conflict.'
                } else {
                    successMessage = 'Project "' + projectFolder.displayName + '" was successfully cloned to project "' + actualNewName + '".';
                }
                // update the projects list
                self._getProjects();
                self.view.showInfoMessage(successMessage);
                return Promise.resolve();
            })
            .catch(function () {
                // something went wrong
                // if we created a folder, delete it
                if (newFolder) {
                    return self._restRequest('folder/' + newFolder.id, 'DELETE', null, null)
                        .then(function () {
                            // managed to clean up
                            self.view.showErrorMessage('Failed to clone project "' + projectFolder.displayName + '". Changes were rolled back.');
                            return Promise.reject();
                        })
                        .catch(function (error) {
                            // failed to clean up
                            self.view.showErrorMessage('Failed to clone project "' + projectFolder.displayName + '". A folder for this new project was created, you can delete it using the Scenario Explorer.');
                            return Promise.reject();
                        });
                } else {
                    self.view.showErrorMessage('Failed to clone project "' + projectFolder.displayName + '". No changes were made.');
                    return Promise.reject();
                }
            });
    },
    _cloneScenario: function (scenarioId, parent, newName) {
        var self = this;

        var payload = {
            displayName: newName,
            sourceScenarioId: scenarioId,
            parent: {
                displayName: parent.displayName,
                id: parent.id,
                objectType: parent.objectType,
                url: parent.url
            }
        };

        return self._restRequest('scenario', 'POST', JSON.stringify(payload), 'JSON');
    },
     _exportProject: function(projectFolderId) {
        var self=this;
        var projectFolder = self._getProjectFolderObject(projectFolderId);
        self.view.showInfoMessage('Exporting project \'' + projectFolder.displayName + '\'...');
        self.dom.downloadFile(insight.resolveRestEndpoint(self.BASE_REST_ENDPOINT + 'folder/' + projectFolder.id + '/export'));
    },
    _deleteProject: function (projectFolderId) {
        var self = this;

        var projectFolder = self._getProjectFolderObject(projectFolderId);

        return self._restRequest('folder/' + projectFolderId, 'DELETE', null, null)
            .then(function (data) {
                try {
                    self.view.showInfoMessage('Project "' + projectFolder.displayName + '" successfully deleted.');
                    self._getProjects();
                } catch (e) {
                    console.error(e);
                    // do nothing - we deleted but for some reason could not handle UI updates
                }
                Promise.resolve();
            }).catch(function (message) {
                self.view.showErrorMessage('Failed to delete project "' + projectFolder.displayName + '". No changes have been made.');

                return Promise.reject();
            });
    },
    _getModalValue: function (event) {
        var modal = $(event.originalEvent.target).parents('.modal');
        var name = modal.find('.dialogValue').val();
        return name.trim();
    },
    _handleRenameConfirmation: function (projectFolderId, event) {
        var self = this;
        var newName = self._getModalValue(event);

        if (!self._validateProjectName(newName)) {
            self.view.showErrorMessage('\"' + newName + '\" is not a valid name for a project.');
            return Promise.reject();
        }

        // check if the chosen name is already in use
        var namingConflict = false;
        $.each(self.currentProjectFolders(), function (i, v) {
            if (v.displayName == newName) {
                self.view.showErrorMessage("Cannot rename. A project exists with the same name");
                namingConflict = true;
            }
        });

        if (!namingConflict)
            return self._renameFolderAndProjectScenario(projectFolderId, newName);
        else
            return Promise.reject();
    },
    _renameFolderAndProjectScenario: function (projectFolderId, newName) {
        var self = this;

        return self._getProjectScenarioForFolder(projectFolderId).then(function (projectScenario) {
            var previousName = projectScenario.displayName;

            var payload = {
                id: projectScenario.id,
                displayName: newName
            };
            return self._restRequest('scenario/' + projectScenario.id, 'POST', JSON.stringify(payload), null)
                .then(function (value) {
                    projectScenario.displayName = newName;

                    var payload = {
                        id: projectFolderId,
                        displayName: newName
                    };
                    return self._restRequest('folder/' + projectFolderId, 'POST', JSON.stringify(payload), null)
                        .then(function (value) {
                            self.view.showInfoMessage('Project successfully renamed from "' + previousName + '" to "' + newName + '".');
                            self._getProjects();
                        }).catch(function () {
                            var payload = {
                                id: projectScenario.id,
                                displayName: previousName
                            };
                            var errormsg = "Failed to rename the project folder but could not roll back action. To correct this error state please rename your project again.";
                            return self._restRequest('scenario/' + projectScenario.id, 'POST', JSON.stringify(payload), null)
                                .then(function () {
                                    projectScenario.displayName = previousName;

                                    errormsg = "Failed to rename the project folder. Action rolled back.";
                                    return Promise.reject();
                                }).catch(function () {
                                    self.view.showErrorMessage(errormsg);
                                    return Promise.reject();
                                });
                        });
                });
        }).catch(function () {
            self.view.showErrorMessage("Failed to rename the project. Action rolled back.");
            return Promise.reject();
        });
    },
    _handleShareConfirmation: function (projectFolderId, event) {
        var self = this;

        var modal = $(event.originalEvent.target).parents('.modal');
        var shareMode = modal.find("input[name='dialogValue']:checked").val();
        self._shareProject(projectFolderId, shareMode);
    },
    _shareProject: function (projectFolderId, newShare) {
        var self = this;

        var projectFolder = self._getProjectFolderObject(projectFolderId);

        // possible share combinations
        var folderTargetShare;
        var projectTargetShare;

        if (newShare == "SHARE_READONLY") {
            folderTargetShare = "READONLY";
            projectTargetShare = "READONLY";
        } else if (newShare == "SHARE_PROJECTREADONLY") {
            folderTargetShare = "FULLACCESS";
            projectTargetShare = "READONLY";
        } else if (newShare == "SHARE_FULL") {
            folderTargetShare = "FULLACCESS";
            projectTargetShare = "FULLACCESS";
        }
        // default to private
        else {
            folderTargetShare = "PRIVATE";
            projectTargetShare = "PRIVATE";
        }

        return self._getProjectScenarioForFolder(projectFolderId).then(function (projectScenario) {
            var previousMode = projectScenario.shareStatus;

            var payload = {
                id: projectScenario.id,
                shareStatus: projectTargetShare
            };
            return self._restRequest('scenario/' + projectScenario.id, 'POST', JSON.stringify(payload), null)
                .then(function () {
                    var payload = {
                        id: projectFolderId,
                        shareStatus: folderTargetShare
                    };
                    return self._restRequest('folder/' + projectFolderId, 'POST', JSON.stringify(payload), null)
                        .then(function () {
                            // invalidate and refresh the information we have cached for the project
                            self._getProjects();
                            self.view.showInfoMessage('Project share status updated');
                        }).catch(function () {
                            var errormsg = "Failed to change share status for project folder but could not rollback. To correct this error state please set the share status directly.";
                            var payload = {
                                id: projectScenario.id,
                                shareStatus: previousMode
                            };
                            return self._restRequest('scenario/' + projectScenario.id, 'POST', JSON.stringify(payload), null)
                                .then(function () {
                                    errormsg = "Failed to change share status for project folder. Action rolled back.";
                                    throw new Error;
                                }).catch(function () {
                                    self.view.showErrorMessage(errormsg);
                                    return Promise.reject();
                                });
                        });
                });
        }).catch(function () {
            self.view.showErrorMessage("Failed to change the project share status.");
            return Promise.reject();
        });
    },

    _deBounceNewProjectButton: function (projectName) {
        var self = this;
        var currentTimestamp = (new Date()).getTime();
        if (self.deBounceNewProjectNames.length > 0) {
            var found;
            for (var i=0; i<self.deBounceNewProjectNames.length;i++)
                if (projectName === self.deBounceNewProjectNames[i].name && currentTimestamp <= (self.deBounceNewProjectNames[i].timestamp + 2000))
                    found = self.deBounceNewProjectNames[i];

            if (found !== undefined)
                return true;
        }

        self.deBounceNewProjectNames.push({name: projectName, timestamp: currentTimestamp});
        return false;
    },
    _importProject: function (projectName) {
        var self = this;
        // a unique name for the working folder
        var workingFolderName = "projectImport_" + Date.now();
        var workingFolder;

        // create a working folder
        return self.dom.promptFileUpload() // returns array of files
            .then(function (files) {
                self.dom.trigger('project.overlay.show', 'Importing Project');

                // next create the working folder
                return self.app.createFolder(self.app._data, workingFolderName) // returns folder object
                    .then(function (folder) {
                        workingFolder = folder;
                    })
                    .then(function () {
                        return self._processImportProjectFile(workingFolder, files)
                    })
                    .then(function (imported) {
                        return self._handleImportedProject(projectName, workingFolder, imported);
                    })
                    .then(function (projectScenario) {
                        // we have finished

                        // first delete the working folder
                        return self._cleanupWorkingFolder(workingFolder.id)
                            .then(function () {
                                self.dom.trigger('project.overlay.setMessage', 'Project Import Complete');
                                // wait 2 seconds then wrap up
                                return new Promise(function (resolve, reject) {
                                    setTimeout(function () {
                                        self.dom.trigger('project.overlay.hide');
                                        self._moveToProject(projectScenario);
                                        self.view.showInfoMessage('Project imported successfully as "' + projectScenario.displayName + '"');
                                        resolve();
                                    }, 2000);
                                });
                            });
                    })
            })
            .catch(function (error) {
                return self._handleUpgradeErrors(workingFolder ? workingFolder.id : undefined, error);
            });
    },
    // clean up working folder
    _cleanupWorkingFolder: function (workingFolderId) {
        var self = this;
        return self._restRequest('folder/' + workingFolderId, 'DELETE', null, null);
    },
    // handle the error and return a rejected promise in all cases
    _handleUpgradeErrors: function (workingFolderId, reason) {
        var self = this;
        reason = reason || 'Unexpected error during project import.';

        self.dom.trigger('project.overlay.hide');
        self.view.showErrorMessage(reason);

        if (workingFolderId) {
            var errormsg = 'The import was not rolled back, to correct this, delete the folder from the scenario explorer.';
            return self._restRequest('folder/' + workingFolderId, 'DELETE', null, null)
                .then(function () {
                    errormsg = 'The import was rolled back.';
                    throw new Error();
                }).catch(function () {
                    self.view.showErrorMessage(errormsg);
                    return Promise.reject();
                });
        } else {
            return Promise.reject();
        }
    },
    _processImportProjectFile: function (workingFolder, fileUploads) {
        var self = this;

        var file = fileUploads[0];
        var formData = new FormData();

        formData.append("scenarios-file", file);
        formData.append("parent-json", JSON.stringify(
            {
                id: workingFolder.id,
                displayName: workingFolder.displayName,
                objectType: workingFolder.objectType,
                url: workingFolder.url
            }
        ));

        var request = {
            url: insight.resolveRestEndpoint(this.BASE_REST_ENDPOINT + 'scenario'),
            data: formData,
            cache: false,
            context: {
                "scenarios-file": file.name,
                "size": file.size
            },
            contentType: false,
            processData: false,
            dataType: 'json',
            type: 'POST'
        };

        return new Promise(function (resolve, reject) {
            var jqXHR = $.ajax(request);

            jqXHR.done(function (data, textStatus, jqXHR) {
                resolve({response: data, folder: workingFolder});
            });

            jqXHR.fail(function (data, textStatus, jqXHR) {
                reject(data);
            });
        });
    },
    _handleImportedProject: function (desiredProjectName, workingFolder, projectImport) {
        var self = this;

        // rest call to server failed
        if (projectImport.response.status !== 200) {
            return Promise.reject("Unexpected error during project import");
        }

        // number of scenarios created by the import
        var projectScenarios = [];
        for (var i=0; i<projectImport.response.scenarios.items.length;i++)
            if (projectImport.response.scenarios.items[i].scenarioType == self.config.projectScenarioType)
                projectScenarios.push(projectImport.response.scenarios.items[i]);

        // number of top level folders created by the import
        var projectRootFolders = [];
        for (var i=0; i<projectImport.response.folders.items.length;i++)
            if (projectImport.response.folders.items[i].parent.id === projectImport.folder.id)
                projectRootFolders.push(projectImport.response.folders.items[i]);

        if (projectScenarios.length == 0)
            return Promise.reject("Error during project import. The imported file does not contain a project scenario");
        if (projectScenarios.length > 1)
            return Promise.reject("Error during project import. The imported file contains more than 1 project scenario");
        if (projectRootFolders.length == 0)
            return Promise.reject("Error during project import. The imported file does not contain a project folder");
        if (projectRootFolders.length > 1)
            return Promise.reject("Error during project import. The imported file contains more than one project folder");

        return self._handleImportedFolder(projectRootFolders[0], projectScenarios[0], desiredProjectName);
    },
    _handleImportedFolder: function (projectFolder, projectScenario, desiredProjectName) {
        var self = this;
        // rename the project folder first, then move it
        // on moving, the name might be decorated if there is a collision
        // so rename project scenairo to the new name of the project folder
        var payload = {
            id: projectFolder.id,
            displayName: desiredProjectName
        };

        // rename the project folder to desired name
        return self._restRequest('folder/' + projectFolder.id, 'POST', JSON.stringify(payload), null)
            .then(function () {
                projectFolder.displayName = desiredProjectName;
                // move the folder to the root
                return self._restRequest('project/' + self.appId + '/children', 'POST', JSON.stringify(projectFolder))
                    .then(function (newProjectFolder) {
                        // rename project scenario to match the final (possibly decorated) name of the project folder
                        projectScenario.displayName = newProjectFolder.displayName;
                        payload = {
                            id: projectScenario.id,
                            displayName: projectScenario.displayName
                        };
                        return self._restRequest('scenario/' + projectScenario.id, 'POST', JSON.stringify(payload), null)
                            .then(function () {
                                return projectScenario;
                            });
                    });
            })
            .catch(function () {
                // failed to rename the folder
                self.view.showErrorMessage("Failed to rename the imported project to " + desiredProjectName);
                return Promise.reject();
            });
    },
    dom: {
        confirmDialog: null,

        trigger: function (event) {
            $(document).trigger(event, _.without(arguments, arguments[0]));
        },
        showConfirmationDialog: function (action, title, message1, message2, callback, currentValue) {
            var self = this;

            // message2 gets wrapped in an info box
            if (message2) {
                message2 = '<div class="alert alert-info"><p>' + message2 + '</p></div>';
            }

            var body;
            switch(action) {
                case "share":
                    body = '<div><p>' + message1 + '</p>' +
                    '<p><form id="modal-form">' +
                    '<div class="radio"><label><input type="radio" name="dialogValue" class="dialogValue" id="SHARE_PRIVATE" value="SHARE_PRIVATE">Don\'t share this project</label></div>' +
                    '<div class="radio"><label><input type="radio" name="dialogValue" class="dialogValue" id="SHARE_READONLY" value="SHARE_READONLY">Share project and scenarios read only</label></div>' +
                    '<div class="radio"><label><input type="radio" name="dialogValue" class="dialogValue" id="SHARE_PROJECTREADONLY" value="SHARE_PROJECTREADONLY">Allow other users to create/edit scenarios</label></div>' +
                    '<div class="radio"><label><input type="radio" name="dialogValue" class="dialogValue" id="SHARE_FULL" value="SHARE_FULL">Allow other users to edit the project and create/edit scenarios</label></div>' +
                    '<div>' + message2 + '</div>';
                    break;
                case "rename":
                case "clone":
                    body = '<div><p>' + message1 + '</p>' +
                    '<form id="modal-form" class="form-horizontal">' +
                    '<div class="form-group">' +
                    '<label for="newProjectName" class="control-label col-sm-3">Project Name</label>' +
                    '<div class="col-sm-9">' +
                    '<input type="text" class="dialogValue form-control" value="">' +
                    '</div></div></form><div>' + message2 + '</div></div>';
                    break;
                default:
                    body =  '<div><p>' + message1 + '</p><div style="margin-top: 10px">' + message2 + '</div></div>';
            }

            self.confirmDialog = bootbox.dialog({
                title: title,
                message: $(body).html(),
                buttons: {
                    ok: {
                        label: action.charAt(0).toUpperCase() + action.slice(1),
                        callback: callback,
                        className: 'btn-primary affirmative'
                    },
                    cancel: {
                        label: 'Cancel',
                        className: 'btn-secondary'
                    }
                },
                show: false,
                className: 'project-actions-modal',
                onEscape: function () {
                    $('[data-bb-handler="cancel"]').click();
                }
            });

            switch(action) {
                case "share":
                    $("body").find('#' + currentValue).prop('checked', true);
                    break;
                case "rename":
                case "clone":
                    self.confirmDialog.on("shown.bs.modal", function (event) {
                        var modal = $(event.target);
                        var $renderedInput = modal.find('input');
                        var renderedInput = $renderedInput[0];
                        var affirmativeButton = modal.find('.affirmative');

                        $renderedInput.on('change keyup', function (event) {
                            if (!self.validateModalInputState(event.originalEvent)) {
                                modal.find('.error-state').text('You must specify a project name');
                                affirmativeButton.prop('disabled', true);
                            } else {
                                modal.find('.error-state').text('');
                                affirmativeButton.prop('disabled', false);
                            }
                        });

                        _.defer(function () {
                            renderedInput.focus();
                            renderedInput.setSelectionRange(0, renderedInput.value.length);
                        });
                    });

                    //Prevent enter from submitting form, but press ok instead
                    var formEle = $('#modal-form');
                    formEle.on('submit', function (event) {
                        event.preventDefault();
                        $('[data-bb-handler="ok"]').click()
                    });

                    $("body").find('.dialogValue').attr('value', currentValue);
                    break;
                default:
                    // do nothing
                    break;
            }

            self.confirmDialog.modal('show');

        },
        validateModalInputState: function (event) {
            return _.trim($(event.target).val()) !== '';
        },
        /* global bootbox */
        downloadFile: function (url) {
            var body = $('body');
            var downloadIframe = body.find('#download-iframe');

            if (downloadIframe.length === 0) {
                downloadIframe = body.append('<iframe style="display: none;" id="download-iframe"></iframe>').find('#download-iframe');
            }

            downloadIframe.attr('src', url);
        },
        promptFileUpload: function (accept) {
            var acceptString = '';
            if (accept !== undefined && accept !== null) {
                acceptString = ' accept="' + accept + '"';
            }

            var uploadHolder = $('#hidden-file-upload-holder');
            if (uploadHolder.length > 0) {
                uploadHolder.remove();
            }
            $('body').append('<div id="hidden-file-upload-holder" style="border: 2px solid red;"><input class="hiddenFileUpload" name="attachment" type="file" ' + acceptString + ' /></div>');
            uploadHolder = $('#hidden-file-upload-holder');

            var promiseFunctions = {
                resolve: null,
                reject: null
            };

            var promise = new Promise(function (resolve, reject) {
                promiseFunctions.resolve = resolve;
                promiseFunctions.reject = reject;
            });

            uploadHolder.find('.hiddenFileUpload').on('change', function () {
                promiseFunctions.resolve(this.files);
            });

            if (typeof window._DONT_OPEN_FILE_DIALOG_ === "undefined") {
                uploadHolder.find('.hiddenFileUpload').click();
            }

            setTimeout(function () {
                promiseFunctions.reject('Upload Timed Out');
            }, 300000);

            return promise;
        },
    },
    _validateForProjectPage: function _validateForProjectPage(scenarios) {
        var self = this;
        var projectPath = '';
        var foundProject = false;
        var foundProjectDetails = null;
        var tooManyProjects = false;
        var errorType = null;

        var invalidScenarios = [];
        var invalidProjects = [];

        var validationmsg;

        for (var i = 0; i < scenarios.length; i++) {
            if (scenarios[i].getScenarioType() === self.config.projectScenarioType) {
                if (!foundProject) {
                    foundProject = true;
                    foundProjectDetails = scenarios[i];
                } else {
                    invalidProjects.push(scenarios[i].getName());
                    errorType = 'tooManyProjects';
                }
            }

            if (errorType !== 'tooManyProjects') {
                if (i === 0) {
                    if (scenarios[i].getScenarioType() === self.config.projectScenarioType) {
                        var escapedProjectName = scenarios[i].getName().replace(/\\/g, '\\\\').replace(/\//g, '\\/');
                        var projectNamePlusSlashLength = escapedProjectName.length + 1;
                        projectPath = scenarios[i].getPath().substring(0, scenarios[i].getPath().length - projectNamePlusSlashLength);
                    } else {
                        errorType = 'projectInWrongPos';
                    }
                } else {
                    var pathIndex = scenarios[i].getPath().indexOf(projectPath);
                    var endOfPath = pathIndex + projectPath.length;

                    if (pathIndex < 0 || scenarios[i].getPath().charAt(endOfPath) !== '/') {
                        invalidScenarios.push(scenarios[i].getName());
                        errorType = 'incompatibleScenarios';
                    }
                }
            }

        }

        if (!foundProject) {
            errorType = 'noProjectScenario';
        }

        switch (errorType) {
            case 'noProjectScenario' :
                validationmsg = 'There is no active project. Please return to the Manage Projects page and create or open a project.';
                break;
            case 'tooManyProjects' :
                invalidProjects.unshift(foundProjectDetails.getName());
                validationmsg = 'You have added the following project' + ((invalidProjects.length > 1) ? 's' : '') + ' to the shelf: "' + invalidProjects.join('", "') + '". Please ensure that you only have one project scenario and that it is in the first position.';
                break;
            case 'incompatibleScenarios' :
                validationmsg = 'There are scenarios from different projects other than "' + foundProjectDetails.getName() + '" on the shelf. Please remove the following scenario' + ((invalidScenarios.length > 1) ? 's: ' : ': "') + invalidScenarios.join('", "') + '".';
                break;
            case 'projectInWrongPos' :
                validationmsg = 'Project "' + foundProjectDetails.getName() + '" is not in the correct shelf position. Please place it into the first position on the shelf.';
                break;
            default:
                validationmsg = "";
        }

        return validationmsg;
    },
    _validateForScenarioPage: function _validateForScenarioPage(scenarios, neededScenarioTypes) {
        var self = this;
        var validationmsg = self._validateForProjectPage(scenarios);
        if (validationmsg)
            return validationmsg;

        if (!neededScenarioTypes) {
            neededScenarioTypes = '*';
        }

        var foundTypes = [];
        for (var i = 0; i < scenarios.length; i++) {
            if (scenarios[i].getScenarioType() !== self.config.projectScenarioType) {
                if (neededScenarioTypes === '*') {
                    break;
                } else {
                    var index = neededScenarioTypes.indexOf(scenarios[i].getScenarioType());

                    if (index > -1) {
                        foundTypes.push(neededScenarioTypes[index]);
                    }
                }
            }
        }

        var missing = _.difference(neededScenarioTypes, foundTypes);
        if (foundTypes.length === 0 && neededScenarioTypes !== '*') {
            validationmsg = 'To view this information please create a new scenario or select an existing scenario of the following type' + ((missing.length > 1) ? 's' : '') + ' "' + missing.join('", "') + '" by clicking on the grey scenario shelf above.';
        } else if (scenarios.length === 1 && neededScenarioTypes === '*') {
            validationmsg = 'This view requires at least one scenario to be selected. Create a new scenario or select an existing scenario by clicking on the grey scenario shelf above.';
        }

        return validationmsg;
    },
    _initShelfValidation: function () {
        var self=this;

        // if the shelf if empty, validation failed
        if (self.view.getScenarioIds().length == 0) {
            self.shelfValidationMessage({
                text:'There is no active project. Please create or open a project.',
                showNav: true,
            });
            self.shelfValid(false);
        }
        else {
            // shelf validation
            self.view
                .withAllScenarios()
                .withSummaryData()
                .once(function (scenarios) {
                    var msg;
                    if (self.config.viewType.toLowerCase() == "project")
                        msg = self.validateShelf('project', scenarios);
                    else if (self.config.viewType.toLowerCase() == "scenario")
                        msg = self.validateShelf('scenario', scenarios);
                    // else no validation required

                    if (msg) {
                        self.shelfValidationMessage({text: msg});
                        self.shelfValid(false);
                    }
                    else {
                        self.shelfValidationMessage();
                        self.shelfValid(true);

                        self._initProjectRevisionTracking();
                    }
                })
                .start();
        }
    },
    _initProjectRevisionTracking: function() {
        var self=this;

        // observe the project entities that the project revision is impacted by
        var entities;
        if (self.config.projectEntities == "all")
            entities = self.app.getModelSchema().getAllEntities();
        else
            entities = self.config.projectEntities;

        // if there are entities that the project revision is impacted by
        if (entities.length>0) {
            // make sure we get th project revision too
            entities = entities.concat([self.config.projectRevisionEntity]);
            self.view
                .withFirstScenario()
                .withEntities(entities)
                .notify(self._handleProjectEntityChangeNotification.bind(self))
                .start();
        };

        // do a revision check and collate a message if inconsistent
        // project revision is an incrementing randomly seeded number
        // newly loaded scenarios default to zero
        // a scenario is dirty when its revision is not zero and not the same as the project
        // but only if there is at least one scenairo on the shelf, to avoid a built in warning about requiring scenarios
        if (self.view.getScenarioIds().length > 0)
            self.view
                .withAllScenarios()
                .withEntities([self.config.projectRevisionEntity])
                .notify(self._handleProjectRevisionChangeNotification.bind(self))
                .start();
    },
    _handleProjectEntityChangeNotification: function(scenario) {
        var self=this;

        // if our project revision is zero this is a page load first fetch
        if (self.projectRevision == 0)
            self.projectRevision = scenario.getScalar(self.config.projectRevisionEntity);
        // if our project revision is different to the incoming
        else if (self.projectRevision != scenario.getScalar(self.config.projectRevisionEntity))
        // another user or mosel caused it to change so store it
            self.projectRevision = scenario.getScalar(self.config.projectRevisionEntity);
        else {
            // our current user caused it to change
            // increment the project revision if we get a notified of a change
            var dataChange = scenario.modify();
            self.projectRevision++;
            dataChange.setScalar(self.config.projectRevisionEntity, self.projectRevision);
            dataChange.commit();
        }
    },
    _handleProjectRevisionChangeNotification: function(scenarios) {
        var self=this;

        var dirtyScenarios = [];
        $.each(scenarios, function (i, scenario) {
            if (i > 0) { // skip project scenario
                if (scenario.getScalar(self.config.projectRevisionEntity) > 0 && scenarios[0].getScalar(self.config.projectRevisionEntity) != scenario.getScalar(self.config.projectRevisionEntity))
                    dirtyScenarios.push(scenario.getName());
            }
        });
        var message;
        if (dirtyScenarios.length > 0)
            message = "The project configuration has changed since the following scenarios were executed: " + dirtyScenarios.join(", ");

        self.projectRevisionMessage(message);
    },
    _init: function() {
        var self = this;

        self.view =  insight.getView();
        self.app = self.view.getApp();
        self.appId = self.app.getId();
        self.schema = self.app.getModelSchema();

        // fetch the list of project folders for a management view
        if (self.config.viewType == "manage")
            self._getProjects();

        /* global VDL */
        VDL('project-overlay', {
            tag: 'project-overlay',
            attributes: [],
            template: '<div data-bind="visible: projectframework.showLoadingOverlay" class="project-loading-overlay"><img class="project-loading-img" src="../../../../distrib/insight-4.7/images/ajax_loader_109.gif" width="109" height="109"/><span style="display: block;" class="msg" data-bind="text: loadingOverlayMessage"></span><span>Please do not navigate away from the page</span></div>',
            createViewModel: function (params) {
                return new OverlayExtension(params);
            }
        });

        self._initShelfValidation();
    }
};

// Initialise the system
function ProjectFramework(userconfig) {
    var self = this;

    $.extend(self, {
        // configuration defaults
        config: {
            projectScenarioType: "PROJECT",             // custom scenario type id for project scenario type
            defaultView: '',                            // the view that Open Project navigates to
            manageView: 'Manage',                       // id of the project management view
            viewType: "",                               // type of the current view. project | scenario. Any other value means neither
            projectEntities: [],                        // list of project entities that impact the project revision for the current view. "all" or [entity names]
            projectRevisionEntity: "ProjectRevision"    // the entity storing the project revision
        }
    });
    $.extend(self.config, userconfig);

    return self;
}

/*
Custom overlay for during custom orchestrated actions like import project
*/
/* global projectframework */
function OverlayExtension(params) {
    this.registerEventListeners();
}
OverlayExtension.prototype = {
    loadingOverlayMessage: ko.observable(''),
    registerEventListeners: function () {
        $(window).on('project.overlay.show', this.show.bind(this))
            .on('project.overlay.hide', this.hide.bind(this))
            .on('project.overlay.setMessage', this.setMessage.bind(this));

        projectframework.showLoadingOverlay.subscribe(this.setMessageOffset);
    },
    setMessageOffset: function (overlayShown) {
    },
    show: function (evnt, initialMessage) {
        projectframework.view.configure({
            executionOverlay: false
        });

        if (initialMessage) {
            this.setMessage(initialMessage);
        }
        projectframework.showLoadingOverlay(true);
    },
    hide: function () {
        projectframework.view.configure({
            executionOverlay: true
        });

        projectframework.showLoadingOverlay(false);
        this.setMessage('');
    },
    setMessage: function () {
        var message = arguments.length === 2 ? arguments[1] : arguments[0];
        this.loadingOverlayMessage(message);
    }
};
